import moomoo as mm
import time
import pandas as pd

quote_ctx = mm.OpenQuoteContext(host='127.0.0.1', port=11111)
err, data1 = quote_ctx.get_market_snapshot("US.NVDA")
print(data1['stock_id'])
quote_ctx.close()