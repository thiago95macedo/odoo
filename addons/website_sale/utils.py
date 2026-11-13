# Part of WETH. See LICENSE file for full copyright and licensing details.
def gmc_format_price(price, currency):
    return f"{currency.round(price)} {currency.name}"
