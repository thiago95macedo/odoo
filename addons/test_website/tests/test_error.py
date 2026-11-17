import weth.tests
from weth.tools import mute_logger


@weth.tests.common.tagged('post_install', '-at_install')
class TestWebsiteError(weth.tests.HttpCase):

    @mute_logger('weth.addons.http_routing.models.ir_http', 'weth.http')
    def test_01_run_test(self):
        self.start_tour("/test_error_view", 'test_error_website')
