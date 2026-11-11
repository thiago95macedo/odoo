{
    "name": "Menu Principal WETH",
    "version": "20.0.1.0.0",
    "summary": "Grade de aplicativos e tela inicial moderna para Odoo Community.",
    "description": """
Menu Principal WETH
===================

Adiciona uma tela inicial moderna ao Odoo Community com grade de aplicativos,
pesquisa instantânea de módulos e saudação personalizada, integrada à paleta
corporativa da WETH Tecnologia.
""",
    "author": "WETH Tecnologia",
    "maintainer": "WETH Tecnologia",
    "website": "https://weth.com.br",
    "license": "LGPL-3",
    "category": "Customizations/Interface",
    "depends": ["web"],
    "data": [
        "views/web_main_menu_views.xml",
    ],
    "assets": {
        "web.assets_backend": [
            "web_main_menu/static/src/**/*",
        ],
    },
    "application": False,
    "installable": True,
    "auto_install": False,
}

