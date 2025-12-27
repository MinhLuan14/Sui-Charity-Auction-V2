module charity_project_v3::charity_auction {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::clock::{Self, Clock};
    use sui::event;
    use sui::object::{Self, UID, ID};
    use std::option;  
    use sui::transfer;
    use sui::tx_context;
    use std::string::String;

    // --- 1. Mã Lỗi (Error Codes) ---
    const EAuctionNotActive: u64 = 1;
    const EBidTooLow: u64 = 2;
    const EAuctionNotEnded: u64 = 3;
    const EAuctionEnded: u64 = 4;
    const ESellerCannotBid: u64 = 5;

    // --- 2. Địa chỉ ví quỹ cứu trợ ---
    const CHARITY_WALLET: address = @0xaa858ae15196622372566b73b1773118e36331a0b24cc3c9d3356867806ac180;

    // --- 3. Cấu trúc dữ liệu ---
    public struct CharityNFT has key, store {
        id: UID,
        name: String,
        metadata: String,
        donor: address,
    }

    public struct Auction has key {
        id: UID,
        nft: option::Option<CharityNFT>,
        seller: address,
        highest_bid: u64,
        highest_bidder: option::Option<address>,
        end_time: u64,
        status: bool,
        escrow: Balance<SUI>,
    }

    // --- 4. Sự kiện ---
    public struct AuctionCreated has copy, drop {
        auction_id: ID,
        nft_id: ID,
        seller: address,
        start_price: u64,
        end_time: u64
    }

    public struct BidPlaced has copy, drop {
        auction_id: ID,
        bidder: address,
        bid_amount: u64
    }

    public struct AuctionEnded has copy, drop {
        auction_id: ID,
        winner: option::Option<address>,
        final_bid: u64
    }

    // --- 5. Các hàm entry ---
    /// Mint NFT riêng lẻ
    entry fun mint_nft(name: String, metadata: String, ctx: &mut TxContext) {
        let nft = CharityNFT {
            id: object::new(ctx),
            name,
            metadata,
            donor: tx_context::sender(ctx),
        };
        transfer::public_transfer(nft, tx_context::sender(ctx));
    }

    /// Tạo cuộc đấu giá từ NFT có sẵn
    entry fun create_auction(
        nft: CharityNFT,
        start_price: u64,
        duration_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let end_time = clock::timestamp_ms(clock) + duration_ms;
        let nft_id = object::id(&nft);

        let auction = Auction {
            id: object::new(ctx),
            nft: option::some(nft),
            seller: sender,
            highest_bid: start_price,
            highest_bidder: option::none(),
            end_time,
            status: true,
            escrow: balance::zero(),
        };

        event::emit(AuctionCreated {
            auction_id: object::id(&auction),
            nft_id,
            seller: sender,
            start_price,
            end_time,
        });

        transfer::share_object(auction);
    }

    /// Mint và đấu giá luôn
    entry fun mint_and_auction(
        name: String,
        metadata: String,
        start_price: u64,
        duration_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let nft = CharityNFT {
            id: object::new(ctx),
            name,
            metadata,
            donor: tx_context::sender(ctx),
        };
        create_auction(nft, start_price, duration_ms, clock, ctx);
    }

    /// Đặt giá (Bid)
    entry fun place_bid(
        auction: &mut Auction,
        bid_coin: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(auction.status, EAuctionNotActive);
        assert!(clock::timestamp_ms(clock) < auction.end_time, EAuctionEnded);
        assert!(sender != auction.seller, ESellerCannotBid);

        let bid_amount = coin::value(&bid_coin);
        assert!(bid_amount > auction.highest_bid, EBidTooLow);

        if (option::is_some(&auction.highest_bidder)) {
            let prev_bidder = *option::borrow(&auction.highest_bidder);
            let prev_balance = balance::withdraw_all(&mut auction.escrow);
            let prev_coin = coin::from_balance(prev_balance, ctx);
            transfer::public_transfer(prev_coin, prev_bidder);
        };

        let new_balance = coin::into_balance(bid_coin);
        balance::join(&mut auction.escrow, new_balance);

        auction.highest_bid = bid_amount;
        auction.highest_bidder = option::some(sender);

        event::emit(BidPlaced {
            auction_id: object::id(auction),
            bidder: sender,
            bid_amount,
        });
    }

    /// Kết thúc đấu giá
    entry fun end_auction(
        auction: &mut Auction,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(auction.status, EAuctionNotActive);
        assert!(clock::timestamp_ms(clock) >= auction.end_time, EAuctionNotEnded);

        auction.status = false;
        let nft = option::extract(&mut auction.nft);

        if (option::is_some(&auction.highest_bidder)) {
            let winner = *option::borrow(&auction.highest_bidder);

            transfer::public_transfer(nft, winner);

            let escrow_balance = balance::withdraw_all(&mut auction.escrow);
            let escrow_coin = coin::from_balance(escrow_balance, ctx);
            transfer::public_transfer(escrow_coin, CHARITY_WALLET);

            event::emit(AuctionEnded {
                auction_id: object::id(auction),
                winner: option::some(winner),
                final_bid: auction.highest_bid,
            });
        } else {
            transfer::public_transfer(nft, auction.seller);
            event::emit(AuctionEnded {
                auction_id: object::id(auction),
                winner: option::none(),
                final_bid: 0,
            });
        }
    }
}
