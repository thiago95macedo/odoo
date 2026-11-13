# Part of WETH. See LICENSE file for full copyright and licensing details.

{
    "name": "Cloud Storage Migration",
    "summary": """Migrate local attachments to cloud storage""",
    "category": "Technical Settings",
    "depends": ["cloud_storage"],
    "data": [
        "data/data.xml",
        "data/ir_cron.xml",
        "views/cloud_storage_migration_report_views.xml",
        "views/res_config_settings.xml",
        'security/ir.access.csv',
    ],
    "author": "WETH Tecnologia",
    "license": "LGPL-3",
}
