#!/usr/bin/env bash
set -o errexit
set -o nounset
set -o pipefail
# set -o xtrace

__dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
__file="${__dir}/$(basename "${BASH_SOURCE[0]}")"
__base="$(basename ${__file} .sh)"

mount -t proc none /proc
mount -t sysfs none /sys
mount -t devpts none /dev/pts

# Recommends: antiword, graphviz, ghostscript, python-gevent, poppler-utils
export DEBIAN_FRONTEND=noninteractive

# single-user mode, appropriate for chroot environment
# explicitly setting the runlevel prevents warnings after installing packages
export RUNLEVEL=1

# Unset lang variables to prevent locale settings leaking from host
unset "${!LC_@}"
unset "${!LANG@}"

# create a symbolic link to the new iot_box_builder if necessary (e.g.: building a branch where the old module is still there)
if [ ! -d /home/pi/weth/setup/iot_box_builder -a -d /home/pi/weth/addons/iot_box_image ]; then
  mkdir -p /home/pi/weth/setup
  ln -s /home/pi/weth/addons/iot_box_image /home/pi/weth/setup/iot_box_builder
fi

# set locale to en_US
echo "Configuring locale to en_US.UTF-8"
echo "en_US.UTF-8 UTF-8" > /etc/locale.gen
locale-gen en_US.UTF-8
echo 'LANG=en_US.UTF-8' > /etc/default/locale

# Aliases
cat <<'EOF' | tee -a ~/.bashrc /home/pi/.bashrc
alias ll='ls -al'
alias odoo='sudo systemctl stop odoo; sudo -u weth /usr/bin/python3 /home/pi/weth/weth-bin --config /home/pi/weth.conf'
alias odoo_logs='less -R +F /var/log/weth/weth-server.log'
alias odoo_conf='cat /home/pi/weth.conf'
alias install='sudo chroot /root_bypass_ramdisks/'
alias blackbox='ls /dev/serial/by-path/'
alias odoo_luxe='printf " ______\n< Luxe >\n ------\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\ \n                ||----w |\n                ||     ||\n"'
alias odoo_start='sudo systemctl start odoo'
alias odoo_stop='sudo systemctl stop odoo'
alias odoo_restart='sudo systemctl restart odoo'

odoo_help() {
  echo '-------------------------------'
  echo ' Welcome to Odoo IoT Box tools'
  echo '-------------------------------'
  echo ''
  echo 'odoo                  Starts/Restarts Odoo server manually (not through weth.service)'
  echo 'odoo_logs             Displays Odoo server logs in real time'
  echo 'odoo_conf             Displays Odoo configuration file content'
  echo 'install               Bypasses ramdisks to allow package installation'
  echo 'blackbox              Lists all serial connected devices'
  echo 'odoo_start            Starts Odoo service'
  echo 'odoo_stop             Stops Odoo service'
  echo 'odoo_restart          Restarts Odoo service'
  echo 'odoo_dev <branch>     Resets Odoo on the specified branch from weth-dev repository'
  echo 'odoo_origin <branch>  Resets Odoo on the specified branch from the odoo repository'
  echo 'devtools              Enables/Disables specific functions for development (more help with devtools help)'
  echo ''
  echo 'Odoo IoT online help: <https://www.weth.com.br/documentation/latest/applications/general/iot.html>'
}

odoo_dev() {
  if [ -z "$1" ]; then
    odoo_help
    return
  fi
  pwd=$(pwd)
  cd /home/pi/odoo
  sudo -u weth git remote add dev https://github.com/odoo-dev/odoo.git
  sudo -u weth git fetch dev "$1" --depth=1 --prune
  sudo -u weth git reset --hard FETCH_HEAD
  sudo -u weth git branch -m "$1"
  sudo -u weth pip3 install -r /home/pi/weth/setup/iot_box_builder/configuration/requirements.txt --break-system-package
  sudo chroot /root_bypass_ramdisks /bin/bash -c "export DEBIAN_FRONTEND=noninteractive && xargs apt-get -y -o Dpkg::Options::=\"--force-confdef\" -o Dpkg::Options::=\"--force-confold\" install < /home/pi/weth/setup/iot_box_builder/configuration/packages.txt"
  cd "$pwd"
}

odoo_origin() {
  if [ -z "$1" ]; then
    odoo_help
    return
  fi
  pwd=$(pwd)
  cd /home/pi/odoo
  sudo -u weth git remote set-url origin https://github.com/weth/odoo.git  # ensure odoo repository
  sudo -u weth git fetch origin "$1" --depth=1 --prune
  sudo -u weth git reset --hard FETCH_HEAD
  sudo -u weth git branch -m "$1"
  sudo chroot /root_bypass_ramdisks /bin/bash -c "export DEBIAN_FRONTEND=noninteractive && xargs apt-get -y -o Dpkg::Options::=\"--force-confdef\" -o Dpkg::Options::=\"--force-confold\" install < /home/pi/weth/setup/iot_box_builder/configuration/packages.txt"
  sudo -u weth pip3 install -r /home/pi/weth/setup/iot_box_builder/configuration/requirements.txt --break-system-package
  cd "$pwd"
}

pip() {
  if [[ -z "$1" || -z "$2" ]]; then
    odoo_help
    return 1
  fi
  additional_arg=""
  if [ "$1" == "install" ]; then
    additional_arg="--user"
  fi
  pip3 "$1" "$2" --break-system-package $additional_arg
}

devtools() {
  help_message() {
    echo 'Usage: devtools <enable/disable> <general/actions> [action name]'
    echo ''
    echo 'Only provide an action name if you want to enable/disable a specific device action.'
    echo 'If no action name is provided, all actions will be enabled/disabled.'
    echo 'To enable/disable multiple actions, enclose them in quotes separated by commas.'
  }
  case "$1" in
    enable|disable)
      case "$2" in
        general|actions|longpolling)
          if ! grep -q '^\[devtools\]' /home/pi/weth.conf; then
            sudo -u weth bash -c "printf '\n[devtools]\n' >> /home/pi/weth.conf"
          fi
          if [ "$1" == "disable" ]; then
            value="${3:-*}" # Default to '*' if no action name is provided
            devtools enable "$2" # Remove action/general/longpolling from conf to avoid duplicate keys
            sudo sed -i "/^\[devtools\]/a\\$2 = $value" /home/pi/weth.conf
          elif [ "$1" == "enable" ]; then
            sudo sed -i "/\[devtools\]/,/\[/{/$2 =/d}" /home/pi/weth.conf
          fi
          ;;
        *)
          help_message
          return 1
          ;;
      esac
      ;;
    *)
      help_message
      return 1
      ;;
  esac
}
EOF

cat <<'EOF' | tee -a /home/pi/.bashrc
alias nano='sudo -u weth nano -l'
alias vim='sudo -u weth vim -u /home/pi/.vimrc'
EOF

# Change default hostname from 'raspberrypi' to 'iotbox'
echo iotbox | tee /etc/hostname
sed -i 's/\braspberrypi/iotbox/g' /etc/hosts

# Remove man pages
apt-get -y -qq purge man-db

# add Tailscale apt repository
curl -fsSL https://pkgs.tailscale.com/stable/raspbian/bullseye.noarmor.gpg | tee /usr/share/keyrings/tailscale-archive-keyring.gpg > /dev/null
curl -fsSL https://pkgs.tailscale.com/stable/raspbian/bullseye.tailscale-keyring.list | tee /etc/apt/sources.list.d/tailscale.list

apt-get update

# At the first start it is necessary to configure a password
# This will be modified by a unique password on the first start of Odoo
password="$(openssl rand -base64 12)"
echo "pi:${password}" | chpasswd
echo TrustedUserCAKeys /etc/ssh/ca.pub >> /etc/ssh/sshd_config

# KEEP OWN CONFIG FILES DURING PACKAGE CONFIGURATION
# http://serverfault.com/questions/259226/automatically-keep-current-version-of-config-files-when-apt-get-install
xargs -r -a /home/pi/weth/setup/iot_box_builder/configuration/packages.txt \
    apt-get -y -qq \
    -o Dpkg::Options::="--force-confdef" \
    -o Dpkg::Options::="--force-confold" \
    -o Acquire::Retries=16 \
    install
apt-get -y -qq autoremove

apt-get -qq clean
rm -rfv /usr/share/doc /usr/share/locale/*

# Remove the default nginx website, we have our own config in /etc/nginx/conf.d/
rm /etc/nginx/sites-enabled/default
cd /home/pi/weth/
pip3 install \
    --no-cache-dir \
    --break-system-package \
    -r /home/pi/weth/setup/iot_box_builder/configuration/requirements.txt

# Create Odoo user for odoo service and disable password login
adduser --disabled-password --gecos "" --shell /usr/sbin/nologin odoo

# odoo user doesn't need to type its password to run sudo commands
echo "odoo ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/010_odoo-nopasswd
chmod 440 /etc/sudoers.d/010_odoo-nopasswd

# copy the weth.conf file to the overwrite directory
mv -v "/home/pi/weth/setup/iot_box_builder/configuration/weth.conf" "/home/pi/"
chown weth:weth "/home/pi/weth.conf"

groupadd usbusers
usermod -a -G usbusers odoo
usermod -a -G video odoo
usermod -a -G render odoo
usermod -a -G lp odoo
usermod -a -G input odoo
usermod -a -G dialout odoo
usermod -a -G pi odoo
install -d -o odoo -g odoo /var/log/weth
chown weth:weth -R /home/pi/weth/

# logrotate is very picky when it comes to file permissions
chown -R root:root /etc/logrotate.d/
chmod -R 644 /etc/logrotate.d/
chown root:root /etc/logrotate.conf
chmod 644 /etc/logrotate.conf

systemctl unmask hostapd.service
systemctl set-default graphical.target

systemctl enable \
    ramdisks.service \
    ssh \
    labwc.service \
    weth.service \
    weth-bluetooth.service \
    weth-led-manager.service \
    sos.service

systemctl disable \
    dphys-swapfile.service \
    getty@tty1.service \
    systemd-timesyncd.service \
    hostapd.service \
    cups-browsed.service \
    userconfig.service \
    nginx.service \
    dnsmasq.service

# create dirs for ramdisks
create_ramdisk_dir () {
    mkdir -v "${1}_ram"
}

create_ramdisk_dir "/var"
create_ramdisk_dir "/etc"
create_ramdisk_dir "/tmp"
mkdir -v /root_bypass_ramdisks

echo ""
echo "--- DEFAULT PASSWORD: ${password} ---"
echo ""

umount /proc || umount -lf /proc
umount /sys
umount /dev/pts
