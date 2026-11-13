# Part of WETH. See LICENSE file for full copyright and licensing details.

{
    "name": "Cloud Storage Google",
    "summary": """Store chatter attachments in the Google cloud""",
    "category": "Technical Settings",
    "depends": ["cloud_storage"],
    "data": [
        "views/settings.xml",
    ],
    "external_dependencies": {
        "python": ["google-auth"],
        "apt": {
            "google-auth": "python3-google-auth",
        },
    },
    'assets': {
        'web.assets_backend': [
            'cloud_storage_google/static/src/**/*',
        ],
    },
    "uninstall_hook": "uninstall_hook",
    'author': 'WETH Tecnologia',
    'license': 'LGPL-3',
}
