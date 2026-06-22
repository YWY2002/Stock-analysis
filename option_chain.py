import moomoo as mm
import time
import pandas as pd
import stock_functions

# -----------------------------Attributes------------------------------------------------
'''
Index(['code', 'option_name', 'strike_price', 'strike_date', 'option_type',
       'exercise_type', 'expiration_type', 'in_the_money', 'left_day', 'price',
       'mid_price', 'bid_price', 'ask_price', 'bid_ask_spread', 'bid_volume',
       'ask_volume', 'bid_ask_volume_ratio', 'change_ratio', 'volume',
       'turnover', 'open_interest', 'open_interest_market_cap', 'vol_oi_ratio',
       'premium', 'implied_volatility', 'history_volatility', 'iv_hv_ratio',
       'delta', 'gamma', 'vega', 'theta', 'rho', 'leverage_ratio',
       'effective_gearing', 'itm_probability', 'buy_to_bep', 'sell_to_bep',
       'buy_profit_probability', 'sell_profit_probability',
       'intrinsic_value_per', 'time_value_per', 'itm_degree', 'otm_degree',
       'otm_probability', 'sell_annualized_return', 'interval_return',
       'underlying'],
      dtype='object')
'''
# req.add_option_filter(mm.OptIndicator.OPTION_TYPE, values=[1])  #1 is call, 2 is put
# req.add_option_filter(mm.OptIndicator.EXPIRATION_TYPE, values=[1])  #1 weekly, 2 monthly, 3 quarterly
# ---------------------------------------------------------------------------------------

# date is in yyyy-mm-dd e.g 2023-08-22
def get_option_chain_with_range(code: str, start: str, end: str, option_type: mm.OptionType) -> pd.DataFrame:
    quote_ctx = mm.OpenQuoteContext(host='127.0.0.1', port=11111)
    ret, data = quote_ctx.get_option_chain(code=code)

    delta_filter = mm.OptionDataFilter()
    delta_filter.delta_max = 0.2
    delta_filter.delta_min = 0.01

    if ret == mm.RET_OK:
        quote_ctx.close()
        return data
        # print(data['volume'])
        # print(type(data))
    pass

def get_option_screener(underlying_code: str):
    quote_ctx = mm.OpenQuoteContext(host='127.0.0.1', port=11111)
    req = mm.OptionScreenRequest(market_categories=[mm.OptMarketCategory.US_STOCK])
    stock_id = stock_functions.get_stock_id(quote_ctx, underlying_code)
    req.add_underlying_filter(mm.OptUnderlyingIndicator.STOCK_LIST, values=[stock_id])

    #-----------------Add attributes to retrieve------------------------------
    req.add_option_retrieve(mm.OptIndicator.STRIKE_PRICE)
    req.add_option_retrieve(mm.OptIndicator.OPTION_TYPE)
    req.add_option_retrieve(mm.OptIndicator.STRIKE_DATE_TIMESTAMP)
    req.add_option_retrieve(mm.OptIndicator.EXERCISE_TYPE)
    # req.add_option_retrieve(mm.OptIndicator.EXPIRATION_TYPE)
    req.add_option_retrieve(mm.OptIndicator.IN_THE_MONEY)
    req.add_option_retrieve(mm.OptIndicator.LEFT_DAY)
    req.add_option_retrieve(mm.OptIndicator.PRICE)
    req.add_option_retrieve(mm.OptIndicator.DELTA)
    req.add_option_retrieve(mm.OptIndicator.VOLUME)

    #-----------------Add filter--------------------------------------------------
    # req.add_option_filter(mm.OptIndicator.OPTION_TYPE, values=[1])      #call option
    req.page_count = 300

    ret, data = quote_ctx.get_option_screen(req)

    if ret == mm.RET_OK:
        last_page, all_count, df = data
        print(f"last page:{last_page}")
        print(all_count)
        print(df.columns)
        print(df[['code', 'option_name', 'strike_price', 'strike_date', 'option_type',
       'exercise_type', 'expiration_type', 'in_the_money', 'left_day', 'price', 'delta', 'volume']])
    else:
        print('error: ', data)

    quote_ctx.close()
    pass

ticker_code = "US.NVDA"
get_option_screener(ticker_code)
# start_date = "2026-05-01"
# end_date = "2026-05-27"
# option_type = mm.OptionType.PUT
# get_option_chain_with_range(ticker_code, start_date, end_date, option_type)