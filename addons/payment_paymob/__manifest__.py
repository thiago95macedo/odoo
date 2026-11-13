# Part of WETH. See LICENSE file for full copyright and licensing details.

{
    "name": "Payment Provider: Paymob",
    "category": "Accounting/Payment Providers",
    "sequence": 350,
    "summary": "An Egyptian payment provider for the Middle East.",
    "description": " ",  # Non-empty string to avoid loading the README file.
    "depends": ["payment"],
    "data": [
        "views/payment_provider_views.xml",
        "data/payment_method_data.xml",
        "data/payment_provider_data.xml",
    ],
    "post_init_hook": "post_init_hook",
    "uninstall_hook": "uninstall_hook",
    "author": "WETH Tecnologia",
    "license": "LGPL-3",
}
