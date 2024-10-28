const BufferLayout = require('buffer-layout'); // For decoding data
const solanaWeb3 = require('@solana/web3.js');
function getRaydiumLayout() {
    const layout = BufferLayout.struct([
        BufferLayout.nu64('status'),                 // u64
        BufferLayout.nu64('nonce'),                  // u64
        BufferLayout.nu64('max_order'),              // u64
        BufferLayout.nu64('depth'),                  // u64
        BufferLayout.nu64('base_decimal'),           // u64
        BufferLayout.nu64('quote_decimal'),          // u64
        BufferLayout.nu64('state'),                  // u64
        BufferLayout.nu64('reset_flag'),             // u64
        BufferLayout.nu64('min_size'),               // u64
        BufferLayout.nu64('vol_max_cut_ratio'),      // u64
        BufferLayout.nu64('amount_wave_ratio'),      // u64
        BufferLayout.nu64('base_lot_size'),          // u64
        BufferLayout.nu64('quote_lot_size'),         // u64
        BufferLayout.nu64('min_price_multiplier'),   // u64
        BufferLayout.nu64('max_price_multiplier'),   // u64
        BufferLayout.nu64('system_decimal_value'),   // u64
        BufferLayout.nu64('min_separate_numerator'), // u64
        BufferLayout.nu64('min_separate_denominator'),// u64
        BufferLayout.nu64('trade_fee_numerator'),    // u64
        BufferLayout.nu64('trade_fee_denominator'),  // u64
        BufferLayout.nu64('pnl_numerator'),          // u64
        BufferLayout.nu64('pnl_denominator'),        // u64
        BufferLayout.nu64('swap_fee_numerator'),     // u64
        BufferLayout.nu64('swap_fee_denominator'),   // u64
        BufferLayout.nu64('base_need_take_pnl'),     // u64
        BufferLayout.nu64('quote_need_take_pnl'),    // u64
        BufferLayout.nu64('quote_total_pnl'),        // u64
        BufferLayout.nu64('base_total_pnl'),         // u64
        BufferLayout.nu64('pool_open_time'),         // u64
        BufferLayout.nu64('punish_pc_amount'),       // u64
        BufferLayout.nu64('punish_coin_amount'),     // u64
        BufferLayout.nu64('orderbook_to_init_time'), // u64
        BufferLayout.blob(16, 'swap_base_in_amount'), // u128 (128 bits = 16 bytes)
        BufferLayout.blob(16, 'swap_quote_out_amount'),// u128 (128 bits)
        BufferLayout.nu64('swap_base2quote_fee'),    // u64
        BufferLayout.blob(16, 'swap_quote_in_amount'), // u128 (128 bits)
        BufferLayout.blob(16, 'swap_base_out_amount'), // u128 (128 bits)
        BufferLayout.nu64('swap_quote2base_fee'),    // u64
        BufferLayout.blob(32, 'base_vault'),         // Pubkey (32 bytes)
        BufferLayout.blob(32, 'quote_vault'),        // Pubkey (32 bytes)
        BufferLayout.blob(32, 'base_mint'),          // Pubkey (32 bytes)
        BufferLayout.blob(32, 'quote_mint'),         // Pubkey (32 bytes)
        BufferLayout.blob(32, 'lp_mint'),            // Pubkey (32 bytes)
        BufferLayout.blob(32, 'open_orders'),        // Pubkey (32 bytes)
        BufferLayout.blob(32, 'market_id'),          // Pubkey (32 bytes)
        BufferLayout.blob(32, 'market_program_id'),  // Pubkey (32 bytes)
        BufferLayout.blob(32, 'target_orders'),      // Pubkey (32 bytes)
        BufferLayout.blob(32, 'withdraw_queue'),     // Pubkey (32 bytes)
        BufferLayout.blob(32, 'lp_vault'),           // Pubkey (32 bytes)
        BufferLayout.blob(32, 'owner'),              // Pubkey (32 bytes)
        BufferLayout.nu64('lp_reserve'),             // u64
        BufferLayout.seq(BufferLayout.nu64(), 3, 'padding') // [u64; 3]
    ]);
    return layout;   
}

function defaultOrder() {
    const OrderData = {
        mode: "buy",
        mint: null,
        orderAmount: 0,
        orderSlippage: 0,
        decimals: 0,
        isSuccessful: false
    };
    return OrderData;
}

function getSwapData(id,order, wallet, solMint,isTest) { 
    if (order.mode == "buy") {
        {
            return {
                id: id,
                isTest:isTest,
                mode :order.mode,
                amount: order.orderAmount,
                slippage: order.orderSlippage,
                inputMint: solMint,
                outputMint: order.mint,
                payer: wallet,
                decimals: order.decimals
            };
        }
        
    } else if (order.mode == "sell") {
        {
            return {
                id: id,
                isTest:isTest,
                mode :order.mode,
                amount: order.orderAmount,
                slippage: order.orderSlippage,
                inputMint: order.mint,
                outputMint: solMint,
                payer: wallet,
                decimals: order.decimals
            };
        }
    } else { 
        throw new Error("Invalid mode. Supported modes: buy, sell");
    }

}


module.exports = {getRaydiumLayout,defaultOrder,getSwapData}