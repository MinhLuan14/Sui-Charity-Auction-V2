#[allow(lint(public_entry, duplicate_alias))]
module charity_auction_v9::charity_impact_protocol {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::clock::{Self, Clock};
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::package;
    use sui::display;
    use sui::event;
    use std::string::{Self, String};
    use std::option::{Self, Option};
    use std::vector;

    /* =======================
        MÃ LỖI (ERROR CODES)
    ========================*/
    const EBidTooLow: u64 = 1;
    const EAuctionEnded: u64 = 2;
    const ENotAuthorized: u64 = 3;
    const ECharityNotVerified: u64 = 4;
    const EAlreadyExecuted: u64 = 5;
    const EInvalidProposal: u64 = 6;
    const ECharityNotEmpty: u64 = 7;

    /* =======================
        SỰ KIỆN (EVENTS)
    ========================*/
    public struct DisbursementRequestCreated has copy, drop {
        proposal_id: ID,
        charity_id: ID,
        amount: u64,
        description: String
    }

    public struct DisbursementDecision has copy, drop {
        proposal_id: ID,
        charity_id: ID,
        status: u8, // 1: Approved, 2: Rejected
        amount: u64
    }
    public struct CharityRegistered has copy, drop {
        charity_id: ID,
        creator: address,
        name: String
    }

    public struct CharityVerified has copy, drop {
        charity_id: ID,
        is_verified: bool
    }

    public struct AuctionCreated has copy, drop {
        auction_id: ID,
        charity_id: ID,
        item_name: String,
        seller: address
    }

    public struct BidPlaced has copy, drop {
        auction_id: ID,
        bidder: address,
        amount: u64,
        new_end_time: u64
    }

    public struct AuctionSettled has copy, drop {
        auction_id: ID,
        winner: Option<address>,
        final_price: u64
    }

    public struct ImpactUpdate has copy, drop {
        charity_id: ID,
        new_level: u64
    }

    /* =======================
        CẤU TRÚC DỮ LIỆU (STRUCTS)
    ========================*/
    public struct AdminCap has key, store { id: UID }

    public struct GlobalConfig has key {
        id: UID,
        admin_fee_wallet: address,
        emergency_fee: u64,
        long_term_fee: u64,
        anti_snipe_ms: u64
    }

    public struct Charity has key {
        id: UID,
        wallet: address,
        name: String,
        description: String,
        website: String,
        logo: String,
        category: u8,
        vault: Balance<SUI>,
        matching_pool: Balance<SUI>,
        is_verified: bool,
        ai_verified: bool,
        impact_level: u64,
        voters: vector<address>,
        voter_count: u64
    }

    public struct CharityNFT has key, store {
        id: UID,
        name: String,
        url: String,
        description: String,
        impact_level: u64
    }

    public struct Auction has key {
        id: UID,
        nft: Option<CharityNFT>,
        seller: address,
        charity_id: ID,
        min_reserve_price: u64,
        highest_bid: u64,
        highest_bidder: Option<address>,
        end_time: u64,
        active: bool,
        escrow: Balance<SUI>
    }

   public struct WithdrawalProposal has key, store {
    id: UID,
    charity_id: ID,
    amount: u64,
    description: String,    // Mục đích giải ngân (Chủ dự án nhập)
    admin_feedback: String, // Lý do từ chối hoặc ghi chú (Admin nhập)
    status: u8,             // 0: Pending, 1: Approved, 2: Rejected
}
    public struct CHARITY_IMPACT_PROTOCOL has drop {}

    /* =======================
        KHỞI TẠO (INIT)
    ========================*/
    fun init(otw: CHARITY_IMPACT_PROTOCOL, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);

        let config = GlobalConfig {
            id: object::new(ctx),
            admin_fee_wallet: sender,
            emergency_fee: 3,
            long_term_fee: 5,
            anti_snipe_ms: 60_000 
        };

        let keys = vector[
            string::utf8(b"name"),
            string::utf8(b"image_url"),
            string::utf8(b"description"),
            string::utf8(b"project_level"),
        ];
        let values = vector[
            string::utf8(b"{name}"),
            string::utf8(b"{url}"),
            string::utf8(b"{description}"),
            string::utf8(b"{impact_level}"),
        ];

        let publisher = package::claim(otw, ctx);
        let mut display = display::new_with_fields<CharityNFT>(&publisher, keys, values, ctx);
        display::update_version(&mut display);

        transfer::public_transfer(AdminCap { id: object::new(ctx) }, sender);
        transfer::public_transfer(publisher, sender);
        transfer::public_share_object(display);
        transfer::share_object(config);
    }

    /* =======================
        CHỨC NĂNG QUẢN TRỊ (ADMIN)
    ========================*/
    public entry fun register_charity(
        wallet: address, name: String, description: String, 
        website: String, logo: String, category: u8, ctx: &mut TxContext
    ) {
        let charity_uid = object::new(ctx);
        let charity_id = object::uid_to_inner(&charity_uid);

        let charity = Charity {
            id: charity_uid, wallet, name, description, website, logo, category,
            vault: balance::zero(), matching_pool: balance::zero(),
            is_verified: false, ai_verified: false, impact_level: 0,
            voters: vector::empty(), voter_count: 0
        };

        event::emit(CharityRegistered {
            charity_id,
            creator: tx_context::sender(ctx),
            name
        });

        transfer::share_object(charity);
    }

    public entry fun verify_charity_ai(_: &AdminCap, charity: &mut Charity) {
        charity.ai_verified = true;
    }

    public entry fun approve_charity_final(_: &AdminCap, charity: &mut Charity) {
        assert!(charity.ai_verified, ECharityNotVerified);
        charity.is_verified = true;
        event::emit(CharityVerified { 
            charity_id: object::id(charity), 
            is_verified: true 
        });
    }

    public entry fun reject_and_delete_charity(_: &AdminCap, charity: Charity) {
        assert!(balance::value(&charity.vault) == 0, ECharityNotEmpty);
        assert!(balance::value(&charity.matching_pool) == 0, ECharityNotEmpty);

        let Charity { 
            id, vault, matching_pool, voters: _, 
            wallet: _, name: _, description: _, website: _, logo: _, 
            category: _, is_verified: _, ai_verified: _, impact_level: _, voter_count: _ 
        } = charity;

        balance::destroy_zero(vault);
        balance::destroy_zero(matching_pool);
        object::delete(id);
    }

    public entry fun deposit_matching(charity: &mut Charity, coin: Coin<SUI>) {
        balance::join(&mut charity.matching_pool, coin::into_balance(coin));
    }

    /* =======================
        ĐẤU GIÁ (AUCTION)
    ========================*/
    public entry fun create_auction(
        charity: &Charity, name: String, url: String, description: String,
        min_price: u64, duration_ms: u64, clock: &Clock, ctx: &mut TxContext
    ) {
        assert!(charity.is_verified, ECharityNotVerified);
        let nft = CharityNFT { id: object::new(ctx), name, url,description, impact_level: 0 };
        let auction_uid = object::new(ctx);
        let auction_id = object::uid_to_inner(&auction_uid);
        
        let auction = Auction {
            id: auction_uid, nft: option::some(nft), seller: tx_context::sender(ctx),
            charity_id: object::id(charity), min_reserve_price: min_price, highest_bid: 0,
            highest_bidder: option::none(), end_time: clock::timestamp_ms(clock) + duration_ms,
            active: true, escrow: balance::zero()
        };

        event::emit(AuctionCreated {
            auction_id,
            charity_id: object::id(charity),
            item_name: name,
            seller: tx_context::sender(ctx)
        });

        transfer::share_object(auction);
    }

    public entry fun place_bid(
        config: &GlobalConfig, auction: &mut Auction, bid: Coin<SUI>, clock: &Clock, ctx: &mut TxContext
    ) {
        let now = clock::timestamp_ms(clock);
        assert!(auction.active && now < auction.end_time, EAuctionEnded);
        let bid_value = coin::value(&bid);
        assert!(bid_value > auction.highest_bid, EBidTooLow);

        if (auction.end_time - now < config.anti_snipe_ms) {
            auction.end_time = now + config.anti_snipe_ms;
        };

        if (option::is_some(&auction.highest_bidder)) {
            let prev = *option::borrow(&auction.highest_bidder);
            transfer::public_transfer(coin::from_balance(balance::withdraw_all(&mut auction.escrow), ctx), prev);
        };

        balance::join(&mut auction.escrow, coin::into_balance(bid));
        auction.highest_bid = bid_value;
        auction.highest_bidder = option::some(tx_context::sender(ctx));

        event::emit(BidPlaced { 
            auction_id: object::id(auction), 
            bidder: tx_context::sender(ctx), 
            amount: bid_value, 
            new_end_time: auction.end_time 
        });
    }

    public entry fun settle_auction(
        config: &GlobalConfig, charity: &mut Charity, auction: &mut Auction, clock: &Clock, ctx: &mut TxContext
    ) {
        assert!(clock::timestamp_ms(clock) >= auction.end_time, EAuctionEnded);
        assert!(auction.active, EAlreadyExecuted);
        auction.active = false;
        let nft = option::extract(&mut auction.nft);

        if (option::is_some(&auction.highest_bidder) && auction.highest_bid >= auction.min_reserve_price) {
            let winner = *option::borrow(&auction.highest_bidder);
            let total = balance::value(&auction.escrow);
            let fee_pct = if (charity.category == 0) config.emergency_fee else config.long_term_fee;
            let fee_amt = (total * fee_pct) / 100;

            transfer::public_transfer(coin::from_balance(balance::split(&mut auction.escrow, fee_amt), ctx), config.admin_fee_wallet);
            transfer::public_transfer(coin::from_balance(balance::split(&mut auction.escrow, auction.min_reserve_price), ctx), auction.seller);
            
            let surplus = balance::withdraw_all(&mut auction.escrow);
            let surplus_val = balance::value(&surplus);
            
            // Logic Matching Pool an toàn
            if (balance::value(&charity.matching_pool) >= surplus_val) {
                balance::join(&mut charity.vault, balance::split(&mut charity.matching_pool, surplus_val));
            } else {
                balance::join(&mut charity.vault, balance::withdraw_all(&mut charity.matching_pool));
            };
            balance::join(&mut charity.vault, surplus);

            if (!vector::contains(&charity.voters, &auction.seller)) {
                vector::push_back(&mut charity.voters, auction.seller);
                charity.voter_count = charity.voter_count + 1;
            };
            if (!vector::contains(&charity.voters, &winner)) {
                vector::push_back(&mut charity.voters, winner);
                charity.voter_count = charity.voter_count + 1;
            };

            let mut final_nft = nft;
            final_nft.impact_level = charity.impact_level;
            transfer::public_transfer(final_nft, winner);

            event::emit(AuctionSettled {
                auction_id: object::id(auction),
                winner: option::some(winner),
                final_price: auction.highest_bid
            });
        } else {
            transfer::public_transfer(nft, auction.seller);
            event::emit(AuctionSettled {
                auction_id: object::id(auction),
                winner: option::none(),
                final_price: 0
            });
        };
    }
/* =======================
        QUẢN TRỊ GIẢI NGÂN (BẢN CHUẨN CUỐI)
    ========================*/
    // 1. CHỦ THIỆN NGUYỆN TẠO YÊU CẦU
    public entry fun create_disbursement_request(
        charity: &Charity, 
        amount: u64, 
        description: String, 
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == charity.wallet, ENotAuthorized);
        assert!(balance::value(&charity.vault) >= amount, EBidTooLow);

        let proposal_uid = object::new(ctx);
        let proposal_id = object::uid_to_inner(&proposal_uid);

        let proposal = WithdrawalProposal {
            id: proposal_uid,
            charity_id: object::id(charity),
            amount,
            description,
            admin_feedback: string::utf8(b""),
            status: 0, 
        };

        // PHÁT EVENT: Giúp Admin Dashboard bắt được yêu cầu ngay lập tức mà không cần load lại trang
        event::emit(DisbursementRequestCreated {
            proposal_id,
            charity_id: object::id(charity),
            amount,
            description
        });

        transfer::public_share_object(proposal);
    }

    // 2. ADMIN PHÊ DUYỆT
    public entry fun admin_approve_disbursement(
        _: &AdminCap, 
        charity: &mut Charity,
        proposal: &mut WithdrawalProposal,
        ctx: &mut TxContext
    ) {
        assert!(proposal.status == 0, EAlreadyExecuted);
        assert!(proposal.charity_id == object::id(charity), EInvalidProposal);
        
        let amount = proposal.amount;
        assert!(balance::value(&charity.vault) >= amount, EBidTooLow);

        let payment_coin = coin::from_balance(balance::split(&mut charity.vault, amount), ctx);
        transfer::public_transfer(payment_coin, charity.wallet);

        proposal.status = 1; 
        proposal.admin_feedback = string::utf8(b"Approved");
        
        // Tăng chỉ số uy tín của dự án sau mỗi lần giải ngân thành công
        charity.impact_level = charity.impact_level + 1;

        event::emit(DisbursementDecision {
            proposal_id: object::id(proposal),
            charity_id: object::id(charity),
            status: 1,
            amount
        });
    }

    // 3. ADMIN TỪ CHỐI
    public entry fun admin_reject_disbursement(
        _: &AdminCap, 
        proposal: &mut WithdrawalProposal,
        reason: String 
    ) {
        assert!(proposal.status == 0, EAlreadyExecuted);
        
        proposal.status = 2; 
        proposal.admin_feedback = reason;

        event::emit(DisbursementDecision {
            proposal_id: object::id(proposal),
            charity_id: proposal.charity_id,
            status: 2,
            amount: proposal.amount
        });
    }

    // 4. DỌN DẸP (Xóa proposal cũ để nhận lại Deposit gas)
    public entry fun delete_disposal(_: &AdminCap, proposal: WithdrawalProposal) {
        let WithdrawalProposal { id, charity_id: _, amount: _, description: _, admin_feedback: _, status: _ } = proposal;
        object::delete(id);
    }
}