# Part of WETH. See LICENSE file for full copyright and licensing details.

{
    "name": "Cloud Storage Azure",
    "summary": """Store chatter attachments in the Azure cloud""",
    "category": "Technical Settings",
    "depends": ["cloud_storage"],
    "data": [
        "views/settings.xml",
    ],
    "uninstall_hook": "uninstall_hook",
    'author': 'WETH Tecnologia',
    'license': 'LGPL-3',
}
