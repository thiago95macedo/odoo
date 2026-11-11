#!/usr/bin/env python3
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import argparse
import logging
import os
import shutil
import subprocess
import sys
import tempfile
import time
import traceback
from datetime import datetime
from glob import glob
from pathlib import Path
from xmlrpc import client as xmlrpclib

import pexpect

#----------------------------------------------------------
# Utils
#----------------------------------------------------------

ROOTDIR = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
TSTAMP = time.strftime("%Y%m%d", time.gmtime())
TSEC = time.strftime("%H%M%S", time.gmtime())
TFULL = time.strftime("%a, %d %b %Y %H:%M:%S %z", time.gmtime())
# Get some variables from release.py
version = ...
version_info = ...
exec(open(os.path.join(ROOTDIR, 'odoo', 'release.py'), 'rb').read())
VERSION = version.split('-')[0].replace('saas~', '')
GPGPASSPHRASE = os.getenv('GPGPASSPHRASE')
GPGID = os.getenv('GPGID')
DOCKERVERSION = VERSION.replace('+', '')
INSTALL_TIMEOUT = 600

DOCKERUSER = """
RUN mkdir /var/lib/odoo && \
    groupadd -g %(group_id)s odoo && \
    useradd -u %(user_id)s -g odoo odoo -d /var/lib/odoo && \
    mkdir /data && \
    chown odoo:odoo /var/lib/odoo /data
USER odoo
""" % {'group_id': os.getgid(), 'user_id': os.getuid()}

_logger = logging.getLogger(__name__)


class OdooTestTimeoutError(Exception):
    pass


class OdooTestError(Exception):
    pass


def run_cmd(cmd, chdir=None, timeout=None):
    _logger.info("Running command: '%s'", ' '.join(cmd))
    return subprocess.run(cmd, cwd=chdir, timeout=timeout)


def _rpc_count_modules(addr='http://127.0.0.1', port=8069, dbname='mycompany'):
    uid = xmlrpclib.ServerProxy('%s:%s/xmlrpc/2/common' % (addr, port)).authenticate(
        dbname, 'admin', 'admin', {}
    )
    modules = xmlrpclib.ServerProxy('%s:%s/xmlrpc/2/object' % (addr, port)).execute(
        dbname, uid, 'admin', 'ir.module.module', 'search', [('state', '=', 'installed')]
    )
    if len(modules) > 1:
        toinstallmodules = xmlrpclib.ServerProxy('%s:%s/xmlrpc/2/object' % (addr, port)).execute(
            dbname, uid, 'admin', 'ir.module.module', 'search', [('state', '=', 'to install')]
        )
        if toinstallmodules:
            _logger.error("Package test: FAILED. Not able to install dependencies of base.")
            raise OdooTestError("Installation of package failed")
        else:
            _logger.info("Package test: successfuly installed %s modules", len(modules))
    else:
        _logger.error("Package test: FAILED. Not able to install base.")
        raise OdooTestError("Package test: FAILED. Not able to install base.")


def publish(args, pub_type, extensions):
    """Publish builded package (move builded files and generate a symlink to the latests)
    :args: parsed program args
    :pub_type: one of [rpm, tgz]
    :extensions: list of extensions to publish
    :returns: published files
    """
    def _publish(release):
        build_path = os.path.join(args.build_dir, release)
        filename = release.split(os.path.sep)[-1]
        release_dir = os.path.join(args.pub, pub_type)
        release_path = os.path.join(release_dir, filename)
        os.makedirs(release_dir, exist_ok=True)
        shutil.move(build_path, release_path)

        # Latest/symlink handler
        release_abspath = os.path.abspath(release_path)
        latest_abspath = os.path.join(os.path.dirname(release_abspath), filename.replace(TSTAMP, 'latest'))

        if os.path.exists(latest_abspath):
            os.unlink(latest_abspath)
        os.symlink(release_abspath, latest_abspath)

        return release_path

    published = []
    for extension in extensions:
        release = glob("%s/odoo_*.%s" % (args.build_dir, extension))
        if release:
            published.append(_publish(release[0]))
    return published


# ---------------------------------------------------------
# Generates an RPM repo
# ---------------------------------------------------------
def rpm_sign(args, file_name):
    """Genereate a rpm repo in publish directory"""
    # Sign the RPM
    rpmsign = pexpect.spawn('/bin/bash', ['-c', 'rpm --resign %s' % file_name], cwd=os.path.join(args.pub, 'rpm'))
    rpmsign.expect_exact('Enter passphrase: ')
    rpmsign.send(GPGPASSPHRASE + '\r\n')
    rpmsign.expect(pexpect.EOF)


def _prepare_build_dir(args, move_addons=True):
    """Copy files to the build directory"""
    _logger.info('Preparing build dir "%s"', args.build_dir)
    cmd = ['rsync', '-a', '--delete', '--exclude', '.git', '--exclude', '*.pyc', '--exclude', '*.pyo']

    run_cmd(cmd + ['%s/' % args.odoo_dir, args.build_dir])
    if not move_addons:
        return
    for addon_path in glob(os.path.join(args.build_dir, 'addons/*')):
        if args.blacklist is None or os.path.basename(addon_path) not in args.blacklist:
            try:
                shutil.move(addon_path, os.path.join(args.build_dir, 'odoo/addons'))
            except shutil.Error as e:
                _logger.warning("Warning '%s' while moving addon '%s", e, addon_path)
                if addon_path.startswith(args.build_dir) and os.path.isdir(addon_path):
                    _logger.info("Removing '%s'", addon_path)
                    try:
                        shutil.rmtree(addon_path)
                    except shutil.Error as rm_error:
                        _logger.warning("Cannot remove '%s': %s", addon_path, rm_error)


#  Docker stuffs
class Docker():
    """Base Docker class. Must be inherited by specific Docker builder class"""
    arch = None

    def __init__(self, args):
        """
        :param args: argparse parsed arguments
        """
        self.args = args
        self.tag = 'odoo-%s-%s-nightly-tests' % (DOCKERVERSION, self.arch)
        self.container_name = None
        self.exposed_port = None
        docker_templates = {
            'tgz': os.path.join(args.build_dir, 'setup/docker/package.dfsrc'),
            'rpm': os.path.join(args.build_dir, 'setup/docker/package.dffedora'),
        }
        self.docker_template = Path(docker_templates[self.arch]).read_text(encoding='utf-8').replace('USER odoo', DOCKERUSER)
        self.test_log_file = '/data/src/test-%s.log' % self.arch
        self.docker_dir = Path(self.args.build_dir) / 'docker'
        if not self.docker_dir.exists():
            self.docker_dir.mkdir()
        self.build_image()

    def build_image(self):
        """Build the dockerimage by copying Dockerfile into build_dir/docker"""
        docker_file = self.docker_dir / 'Dockerfile'
        docker_file.write_text(self.docker_template)
        shutil.copy(os.path.join(self.args.build_dir, 'requirements.txt'), self.docker_dir)
        run_cmd(["docker", "build", "--rm=True", "-t", self.tag, "."], chdir=self.docker_dir, timeout=1200).check_returncode()
        shutil.rmtree(self.docker_dir)

    def run(self, cmd, build_dir, container_name, user='odoo', exposed_port=None, detach=False, timeout=None):
        self.container_name = container_name
        docker_cmd = [
            "docker",
            "run",
            "--user=%s" % user,
            "--name=%s" % container_name,
            "--rm",
            "--volume=%s:/data/src" % build_dir
        ]

        if exposed_port:
            docker_cmd.extend(['-p', '127.0.0.1:%s:%s' % (exposed_port, exposed_port)])
            self.exposed_port = exposed_port
        if detach:
            docker_cmd.append('-d')
            # preserve logs in case of detached docker container
            cmd = '(%s) > %s 2>&1' % (cmd, self.test_log_file)

        docker_cmd.extend([
            self.tag,
            "/bin/bash",
            "-c",
            "cd /data/src && %s" % cmd
        ])
        run_cmd(docker_cmd, timeout=timeout).check_returncode()

    def is_running(self):
        dinspect = subprocess.run(['docker', 'container', 'inspect', self.container_name], stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)
        return True if dinspect.returncode == 0 else False

    def stop(self):
        run_cmd(["docker", "stop", self.container_name]).check_returncode()

    def test_odoo(self):
        _logger.info('Starting to test Odoo install test')
        start_time = time.time()
        while self.is_running() and (time.time() - start_time) < INSTALL_TIMEOUT:
            time.sleep(5)  # give some time for odoo to install and start
            if os.path.exists(os.path.join(self.args.build_dir, 'odoo.pid')):
                try:
                    _rpc_count_modules(port=self.exposed_port)
                    return
                finally:
                    self.stop()
        if self.is_running():
            self.stop()
            raise OdooTestTimeoutError('Odoo pid file never appeared after %s sec' % INSTALL_TIMEOUT)
        raise OdooTestError('Error while installing/starting Odoo after %s sec.\nSee testlogs.txt in build dir' % int(time.time() - start_time))

    def build(self):
        """To be overriden by specific builder"""
        pass

    def start_test(self):
        """To be overriden by specific builder"""
        pass


class DockerTgz(Docker):
    """Docker class to build python src package"""

    arch = 'tgz'

    def build(self):
        _logger.info('Start building python tgz package')
        self.run('python3 setup.py sdist --quiet --formats=gztar,zip', self.args.build_dir, 'odoo-src-build-%s' % TSTAMP)
        os.rename(glob('%s/dist/odoo-*.tar.gz' % self.args.build_dir)[0], '%s/odoo_%s.%s.tar.gz' % (self.args.build_dir, VERSION, TSTAMP))
        os.rename(glob('%s/dist/odoo-*.zip' % self.args.build_dir)[0], '%s/odoo_%s.%s.zip' % (self.args.build_dir, VERSION, TSTAMP))
        _logger.info('Finished building python tgz package')

    def start_test(self):
        if not self.args.test:
            return
        _logger.info('Start testing python tgz package')
        cmds = [
            'service postgresql start',
            'su postgres -s /bin/bash -c "createuser -s odoo"',
            'su odoo -s /bin/bash -c "python3 -m venv /var/lib/odoo/odoovenv"',
            'su odoo -s /bin/bash -c "/var/lib/odoo/odoovenv/bin/python3 -m pip install --upgrade pip"',
            'su odoo -s /bin/bash -c "/var/lib/odoo/odoovenv/bin/python3 -m pip install -r /opt/release/requirements.txt"',
            f'su odoo -s /bin/bash -c "/var/lib/odoo/odoovenv/bin/python3 -m pip install /data/src/odoo_{VERSION}.{TSTAMP}.tar.gz"',
            'su odoo -s /bin/bash -c "createdb mycompany"',
            'su odoo -s /bin/bash -c "/var/lib/odoo/odoovenv/bin/odoo -d mycompany -i base --stop-after-init"',
            'su odoo -s /bin/bash -c "/var/lib/odoo/odoovenv/bin/odoo -d mycompany --pidfile=/data/src/odoo.pid --http-interface 0.0.0.0"',
        ]
        self.run(' && '.join(cmds), self.args.build_dir, 'odoo-src-test-%s' % TSTAMP, user='root', detach=True, exposed_port=8069, timeout=300)
        self.test_odoo()
        _logger.info('Finished testing tgz package')


class DockerRpm(Docker):
    """Docker class to build rpm package"""

    arch = 'rpm'

    def build(self):
        _logger.info('Start building fedora rpm package')
        rpmbuild_dir = '/var/lib/odoo/rpmbuild'
        build_date = datetime.now().strftime('%a %b %d %Y')
        cmds = [
            'cd /data/src',
            'mkdir -p dist',
            'rpmdev-setuptree -d',
            f'cp -a /data/src/setup/rpm/odoo.spec {rpmbuild_dir}/SPECS/',
            f'tar --transform "s/^\\./odoo-{VERSION}/" -c -z -f {rpmbuild_dir}/SOURCES/odoo-{VERSION}.tar.gz .',
            f'rpmbuild -bb --define="%version {VERSION}" --define "%release {TSTAMP}" --define "%build_date {build_date}" /data/src/setup/rpm/odoo.spec',
            f'mv {rpmbuild_dir}/RPMS/noarch/odoo*.rpm /data/src/dist/'
        ]
        self.run(' && '.join(cmds), self.args.build_dir, f'odoo-rpm-build-{TSTAMP}')
        os.rename(glob('%s/dist/odoo-*.noarch.rpm' % self.args.build_dir)[0], '%s/odoo_%s.%s.rpm' % (self.args.build_dir, VERSION, TSTAMP))
        _logger.info('Finished building fedora rpm package')

    def start_test(self):
        if not self.args.test:
            return
        _logger.info('Start testing rpm package')
        cmds = [
            'su postgres -c "/usr/bin/pg_ctl -D /var/lib/postgres/data start"',
            'sleep 5',
            'su postgres -c "createuser -s odoo"',
            'su odoo -c "createdb mycompany"',
            'dnf install -q /data/src/odoo_%s.%s.rpm -y' % (VERSION, TSTAMP),
            'su odoo -s /bin/bash -c "odoo -c /etc/odoo/odoo.conf -d mycompany -i base --stop-after-init"',
            'su odoo -s /bin/bash -c "odoo -c /etc/odoo/odoo.conf -d mycompany --pidfile=/data/src/odoo.pid --http-interface 0.0.0.0"',
        ]
        self.run(' && '.join(cmds), self.args.build_dir, 'odoo-rpm-test-%s' % TSTAMP, user='root', detach=True, exposed_port=8069, timeout=300)
        self.test_odoo()
        _logger.info('Finished testing rpm package')

    def gen_rpm_repo(self, args, rpm_filepath):
        pub_repodata_path = os.path.join(args.pub, 'rpm', 'repodata')
        # Removes the old repodata
        if os.path.isdir(pub_repodata_path):
            shutil.rmtree(pub_repodata_path)

        # Copy files to a temp directory (required because the working directory must contain only the
        # files of the last release)
        temp_path = tempfile.mkdtemp(suffix='rpmPackages')
        shutil.copy(rpm_filepath, temp_path)

        _logger.info('Start creating rpm repo')
        self.run('createrepo /data/src/', temp_path, 'odoo-rpm-createrepo-%s' % TSTAMP)
        shutil.copytree(os.path.join(temp_path, "repodata"), pub_repodata_path)

        # Remove temp directory
        shutil.rmtree(temp_path)


def parse_args():
    ap = argparse.ArgumentParser()
    build_dir = "%s-%s-%s" % (ROOTDIR, TSEC, TSTAMP)
    log_levels = {"debug": logging.DEBUG, "info": logging.INFO, "warning": logging.WARNING, "error": logging.ERROR, "critical": logging.CRITICAL}

    ap.add_argument("-b", "--build-dir", default=build_dir, help="build directory (%(default)s)", metavar="DIR")
    ap.add_argument("-p", "--pub", default=None, metavar="DIR", help="publish directory; if omitted, packages are only built (use --no-remove to keep the artifacts)")
    ap.add_argument("--logging", action="store", choices=list(log_levels.keys()), default="info", help="Logging level")
    ap.add_argument("--build-rpm", action="store_true")
    ap.add_argument("--build-tgz", action="store_true")

    ap.add_argument("-t", "--test", action="store_true", default=False, help="Test built packages")
    ap.add_argument("-s", "--sign", action="store_true", default=False, help="Generate Rpm repo")
    ap.add_argument("--no-remove", action="store_true", help="don't remove build dir")
    ap.add_argument("--blacklist", nargs="*", help="Modules to blacklist in package")

    parsed_args = ap.parse_args()
    if parsed_args.sign and not parsed_args.pub:
        ap.error("--sign requires --pub")
    logging.basicConfig(format='%(asctime)s %(levelname)s: %(message)s', datefmt='%Y-%m-%d %I:%M:%S', level=log_levels[parsed_args.logging])
    parsed_args.odoo_dir = ROOTDIR
    return parsed_args


def main(args):
    try:
        if args.build_tgz:
            _prepare_build_dir(args)
            docker_tgz = DockerTgz(args)
            docker_tgz.build()
            try:
                docker_tgz.start_test()
                if args.pub:
                    published_files = publish(args, 'tgz', ['tar.gz', 'zip'])
            except Exception as e:
                _logger.error("Won't publish the tgz release.\n Exception: %s", e)
        if args.build_rpm:
            _prepare_build_dir(args)
            docker_rpm = DockerRpm(args)
            docker_rpm.build()
            try:
                docker_rpm.start_test()
                if args.pub:
                    published_files = publish(args, 'rpm', ['rpm'])
                    if args.sign:
                        _logger.info('Signing rpm package')
                        rpm_sign(args, published_files[0])
                        _logger.info('Generate rpm repo')
                        docker_rpm.gen_rpm_repo(args, published_files[0])
            except Exception as e:
                _logger.error("Won't publish the rpm release.\n Exception: %s", e)
    except Exception as e:
        _logger.error('Something bad happened ! : %s', e)
        traceback.print_exc()
    finally:
        if args.no_remove:
            _logger.info('Build dir "%s" not removed', args.build_dir)
        else:
            if os.path.exists(args.build_dir):
                shutil.rmtree(args.build_dir)
                _logger.info('Build dir %s removed', args.build_dir)


if __name__ == '__main__':
    args = parse_args()
    if os.path.exists(args.build_dir):
        _logger.error('Build dir "%s" already exists.', args.build_dir)
        sys.exit(1)
    main(args)
