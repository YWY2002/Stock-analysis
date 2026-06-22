import moomoo as mm
import time

class OrderBookTest(mm.OrderBookHandlerBase):
    def on_recv_rsp(self, rsp_pb):
        ret_code, data = super(OrderBookTest,self).on_recv_rsp(rsp_pb)
        if ret_code != mm.RET_OK:
            print("OrderBookTest: error, msg: %s" % data)
            return mm.RET_ERROR, data
        print("OrderBookTest ", data) # OrderBookTest's own processing logic
        return mm.RET_OK, data

quote_ctx = mm.OpenQuoteContext(host='127.0.0.1', port=11111)  # Create quote object
handler = OrderBookTest()
quote_ctx.set_handler(handler) # Set real-time swing callback
ret, data = quote_ctx.subscribe(['US.AAPL'], [mm.SubType.ORDER_BOOK]) # Subscribe to the order type, OpenD starts to receive continuous push from the server

if ret == mm.RET_OK:
    print(data)
else:
    print('error:', data)
time.sleep(15) # Set the script to receive OpenD push duration to 15 seconds
quote_ctx.close()
