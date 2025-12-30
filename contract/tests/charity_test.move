#[test_only]
module charity_auction_v89::charity_auction_v8_tests {
    use sui::test_scenario::{Self as ts};
    use sui::coin;
    use sui::sui::SUI;
    use sui::clock;
    use charity_auction_v8::charity_auction_v9::{Self, Charity, AdminCap, Auction, GlobalConfig};
    use std::string;

    // --- TEST 1: Duyệt Charity (Giữ nguyên vì đã chuẩn) ---
    #[test]
    fun test_charity_verification_flow() {
        let admin = @0xAD;
        let charity_owner = @0xCA;
        let mut scenario = ts::begin(admin);
        charity_auction_v8::init_for_testing(ts::ctx(&mut scenario));

        ts::next_tx(&mut scenario, charity_owner);
        {
            charity_auction_v8::register_charity(
                string::utf8(b"Blue Dragon"),
                string::utf8(b"Children Charity"),
                charity_owner,
                string::utf8(b"ipfs://cid123"),
                ts::ctx(&mut scenario)
            );
        };

        ts::next_tx(&mut scenario, admin);
        {
            let mut charity = ts::take_shared<Charity>(&scenario);
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            charity_auction_v8::confirm_ai_audit(&admin_cap, &mut charity);
            charity_auction_v8::approve_charity(&admin_cap, &mut charity);
            ts::return_shared(charity);
            ts::return_to_sender(&scenario, admin_cap);
        };
        ts::end(scenario);
    }

    // --- TEST 2: Logic Hoàn tiền + Kiểm tra Kéo dài thời gian (Anti-Snipe) ---
    #[test]
    fun test_bid_refund_and_extension_flow() {
        let admin = @0xAD;
        let bidder1 = @0xB1;
        let bidder2 = @0xB2;

        let mut scenario = ts::begin(admin);
        let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));

        charity_auction_v8::init_for_testing(ts::ctx(&mut scenario));

        // Setup Auction
        ts::next_tx(&mut scenario, admin);
        {
            charity_auction_v8::register_charity(string::utf8(b"A"), string::utf8(b"B"), admin, string::utf8(b"C"), ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, admin);
        {
            let mut charity = ts::take_shared<Charity>(&scenario);
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            charity_auction_v8::confirm_ai_audit(&admin_cap, &mut charity);
            charity_auction_v8::approve_charity(&admin_cap, &mut charity);
            
            // Tạo auction kết thúc sau 1 giờ (3600000 ms)
            charity_auction_v8::mint_and_auction_v8(&charity, string::utf8(b"NFT"), string::utf8(b"D"), string::utf8(b"U"), 100, 500, 3600000, &clock, ts::ctx(&mut scenario));
            ts::return_shared(charity);
            ts::return_to_sender(&scenario, admin_cap);
        };

        // Bidder 1 bid
        ts::next_tx(&mut scenario, bidder1);
        {
            let mut auction = ts::take_shared<Auction>(&scenario);
            let config = ts::take_shared<GlobalConfig>(&scenario);
            let coin1 = coin::mint_for_testing<SUI>(200, ts::ctx(&mut scenario));
            charity_auction_v8::place_bid_v8(&config, &mut auction, coin1, &clock, ts::ctx(&mut scenario));
            ts::return_shared(auction);
            ts::return_shared(config);
        };

        // GIẢ LẬP: Thời gian trôi đến gần cuối (còn 2 phút nữa kết thúc)
        clock::set_for_testing(&mut clock, 3500000); 

        // Bidder 2 bid ở phút chót
        ts::next_tx(&mut scenario, bidder2);
        {
            let mut auction = ts::take_shared<Auction>(&scenario);
            let config = ts::take_shared<GlobalConfig>(&scenario);
            
            let old_end_time = charity_auction_v8::get_end_time(&auction);
            let coin2 = coin::mint_for_testing<SUI>(300, ts::ctx(&mut scenario));
            charity_auction_v8::place_bid_v8(&config, &mut auction, coin2, &clock, ts::ctx(&mut scenario));

            // KIỂM TRA 1: Thời gian kết thúc có được tự động kéo dài không?
            assert!(charity_auction_v8::get_end_time(&auction) > old_end_time, 1);

            ts::return_shared(auction);
            ts::return_shared(config);
        };

        // KIỂM TRA 2: Bidder 1 có nhận lại tiền không?
        ts::next_tx(&mut scenario, bidder1);
        {
            let refund_coin = ts::take_from_sender<coin::Coin<SUI>>(&scenario);
            assert!(coin::value(&refund_coin) == 200, 2);
            ts::return_to_sender(&scenario, refund_coin);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }
}