import moomoo as mm
import time
import pandas as pd

def get_stock_id(quote_ctx: mm.OpenQuoteContext, code: str):
    # quote_ctx = mm.OpenQuoteContext(host='127.0.0.1', port=11111)
    
    ret, data = quote_ctx.get_stock_basicinfo(mm.Market.US, mm.SecurityType.STOCK, code_list=code)

    if ret == mm.RET_OK:
        # last_page, all_count, df = data
        print(data)
        return data['stock_id']
    else:
        print('error: ', data)

    quote_ctx.close()
    