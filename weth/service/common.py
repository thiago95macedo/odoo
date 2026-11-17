import threading

import weth.release
from weth.exceptions import AccessDenied
from weth.modules.registry import Registry


RPC_VERSION_1 = {
        'server_version': weth.release.version,
        'server_version_info': weth.release.version_info,
        'server_serie': weth.release.serie,
        'protocol_version': 1,
}

def exp_login(db, login, password):
    return exp_authenticate(db, login, password, None)

def exp_authenticate(db, login, password, user_agent_env):
    if not user_agent_env:
        user_agent_env = {}
    thread = threading.current_thread()
    with Registry(db).cursor() as cr:
        env = weth.api.Environment(cr, None, {})
        if hasattr(thread, 'url'):
            domain = thread.url
            host_id = env["ir.http"]._get_host_id_from_domain(domain)
            env = weth.api.Environment(cr, None, {'host_id': host_id})

        env.transaction.default_env = env  # force default_env
        try:
            credential = {'login': login, 'password': password, 'type': 'password'}
            return env['res.users'].authenticate(credential, {**user_agent_env, 'interactive': False})['uid']
        except AccessDenied:
            return False

def exp_version():
    return RPC_VERSION_1

def dispatch(method, params):
    g = globals()
    exp_method_name = 'exp_' + method
    if exp_method_name in g:
        return g[exp_method_name](*params)
    else:
        raise Exception("Method not found: %s" % method)
