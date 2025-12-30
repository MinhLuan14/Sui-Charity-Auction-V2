const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const axios = require('axios');
const pdf = require('pdf-parse');
require('dotenv').config();

const app = express();

// --- CẤU HÌNH ---
app.use(cors());
app.use(express.json());
app.get('/', (req, res) => {
    res.status(200).send("✅ SUI CHARITY AI BACKEND IS LIVE 💙");
});
// Kiểm tra API Key
if (!process.env.GROQ_API_KEY) {
    console.error("❌ LỖI: Thiếu GROQ_API_KEY trong file .env");
    process.exit(1);
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// === SYSTEM PROMPT CHI TIẾT CHO SUI CHARITY AUCTION ===
const SYSTEM_PROMPT = `
Bạn là SUI CHARITY GUARDIAN 💙 – trợ lý chatbot chuyên giới thiệu và hỗ trợ người dùng về dự án "Sui Charity Auction" – nền tảng đấu giá NFT thiện nguyện minh bạch trên Sui Blockchain.

Hãy luôn trả lời bằng tiếng Việt, giọng điệu chân thành, ấm áp, truyền cảm hứng về lòng tốt và giá trị cộng đồng. Thường xuyên sử dụng emoji 💙 ❤️ 🏫 để tạo cảm giác gần gũi.

Knowledge chính (chỉ sử dụng thông tin từ đây, không tự sáng tạo thêm chi tiết ngoài):
{
    "projectName": "Sui Charity Auction",
    "mission": "Nền tảng đấu giá NFT thiện nguyện minh bạch trên Sui Blockchain. Mục tiêu gây quỹ cho các haonf cảnh khó khắn và  xây trường học vùng cao.",
    "rules": {
        "startingBid": "5-20 SUI (Vật phẩm thường), 50-200 SUI (Tác phẩm nghệ thuật), >500 SUI (Vật phẩm hiếm/đặc biệt).",
        "network": "Sui Network (Layer 1)",
        "transparency": "Giao dịch qua Smart Contract, theo dõi trực tiếp trên Sui Explorer."
    },
    "authentication": {
        "isOriginal": "NFT chính chủ phải do ví Admin của Sui Charity đúc (Mint).",
        "checkFake": "Cảnh báo người dùng kiểm tra Collection ID và lịch sử ví Donor trước khi đặt giá.",
        "verifiedTag": "Chỉ những NFT có dấu tích xanh xác minh trên nền tảng mới là hàng thật."
    },
    "biddingStrategy": {
        "outbidAdvice": "Nếu giá hiện tại chưa vượt quá 150% giá đề xuất, việc nâng giá (Bid) là hợp lý để ủng hộ cộng đồng.",
        "emotionalValue": "Mỗi bước giá tăng thêm là một đóng góp trực tiếp cho trẻ em nghèo, giá trị tinh thần vượt xa con số hiển thị."
    },
    "historicalData": [
        {
            "itemType": "Tranh vẽ tay",
            "soldPrice": "120 SUI",
            "cause": "Hỗ trợ 2 ca mổ tim thành công",
            "appraisalScore": "9.5/10"
        },
        {
            "itemType": "Vật phẩm kỷ niệm",
            "soldPrice": "45 SUI",
            "cause": "Tặng quà Tết cho 50 hộ nghèo",
            "appraisalScore": "8.0/10"
        }
    ],
    "faq": {
        "howToJoin": "Kết nối Sui Wallet (Suiet, Martian...), chọn vật phẩm và đặt mức giá cao hơn người trước tối thiểu 5%.",
        "failedBid": "Nếu bạn không thắng, tiền sẽ được Smart Contract trả về ví tự động ngay lập tức."
    }
}

Mô hình hoạt động MVP:
• Người tặng (Donors): Quyên góp tranh vẽ, đồ lưu niệm hoặc NFT nghệ thuật → được mint thành NFT trên Sui.
• Người đấu giá (Bidders): Đặt giá bằng SUI token (hiện tại trên Testnet).
• Smart Contract: Tự động giữ tiền của người đặt cao nhất. Khi hết giờ → NFT chuyển cho người thắng, 100% tiền chuyển thẳng đến ví công khai của quỹ cứu trợ (không qua trung gian).

Phong cách trả lời:
- Luôn nhiệt tình, khích lệ hành động thiện nguyện.
- Nếu người dùng lần đầu (không có history hoặc tin nhắn chào), hãy chủ động giới thiệu:
  "Chào bạn 💙! Mình là SUI CHARITY GUARDIAN – trợ lý của Sui Charity Auction, nền tảng đấu giá NFT để gây quỹ mổ tim cho trẻ em và xây trường học vùng cao. Mọi đồng tiền từ đấu giá đều được chuyển trực tiếp 100% đến quỹ từ thiện qua blockchain Sui, hoàn toàn minh bạch nhé ❤️. Bạn muốn biết cách tham gia, xem vật phẩm đang đấu giá hay nghe câu chuyện ý nghĩa nào không ạ?"

- Nhấn mạnh tính minh bạch, an toàn và giá trị tinh thần.
- Khuyến khích kiểm tra giao dịch trên Sui Explorer và xác thực NFT.
- Không hứa hẹn lợi nhuận tài chính, chỉ tập trung vào giá trị thiện nguyện.
- Nhắc nhẹ về tính minh bạch của Blockchain Sui Network.
- Nhấn mạnh rằng 100% số tiền đấu giá sẽ được Smart Contract chuyển thẳng đến quỹ.

Hãy trả lời ngắn gọn, dễ hiểu, và luôn kết thúc bằng lời mời tương tác để giữ cuộc trò chuyện tiếp diễn.
`;
// === [MỚI] SYSTEM PROMPT CHO KIỂM ĐỊNH HỒ SƠ ===
const SYSTEM_PROMPT_AUDIT = `
Bạn là một kiểm toán viên cao cấp của hệ thống Sui Charity.
Nhiệm vụ: Đọc văn bản trích xuất từ hồ sơ PDF và đối chiếu với tên quỹ đăng ký.
Tiêu chí chấm điểm (Score):
- 100%: Tên quỹ trong hồ sơ khớp hoàn toàn với tên đăng ký.
- 70-90%: Tên quỹ khớp một phần hoặc hồ sơ có dấu mộc/thông tin hợp lệ.
- <50%: Hồ sơ không liên quan hoặc văn bản trống.

YÊU CẦU: Luôn trả về JSON format chuẩn.
`;
// --- ROUTE KIỂM TRA ---
app.get('/', (req, res) => {
    res.status(200).send("✅ SUI CHARITY AUCTION AI BACKEND ĐANG HOẠT ĐỘNG BÌNH THƯỜNG 💙");
});
// 1. ENDPOINT CHATBOT CHÍNH
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history = [], type } = req.body;

        // Nếu Frontend lỡ gọi vào đây với type viết hộ, ta trả về kết quả viết hộ luôn
        if (type === 'generate_description') {
            // Tự động chuyển hướng xử lý sang logic viết mô tả
            const completion = await groq.chat.completions.create({
                messages: [{ role: "system", content: "You are an expert in writing descriptions for charity NFTs." }, { role: "user", content: `Write a description for: ${message}` }],
                model: "llama-3.3-70b-versatile",
            });
            return res.json({ reply: completion.choices[0].message.content });
        }
        const messages = [
            { role: "system", content: SYSTEM_PROMPT },
            ...history,
            { role: "user", content: message }
        ];

        const completion = await groq.chat.completions.create({
            messages,
            model: "llama-3.3-70b-versatile", // hoặc llama3-70b-8192 nếu bạn muốn mạnh hơn
            temperature: 0.6,
            max_tokens: 1024,
        });

        const reply = completion.choices[0].message.content;
        res.json({ reply });

    } catch (error) {
        console.error("Lỗi API Groq:", error.message);
        res.status(500).json({ error: "AI đang bận, bạn thử lại sau vài giây nhé 💙" });
    }
});

// 2. ENDPOINT TẠO MÔ TẢ VẬT PHẨM ĐẤU GIÁ (tùy chọn nâng cao)
app.post('/api/generate-description', async (req, res) => {
    try {
        const { itemName, story, cause, donorName } = req.body;

        const prompt = `
Bạn là chuyên gia viết bài giới thiệu vật phẩm đấu giá NFT thiện nguyện, giọng văn xúc động, truyền cảm hứng.
Hãy viết một đoạn mô tả hấp dẫn cho vật phẩm sau, nhấn mạnh giá trị nghệ thuật và ý nghĩa nhân văn:

Tên vật phẩm: ${itemName || "Vật phẩm đặc biệt"}
Câu chuyện: ${story || "Một tác phẩm được tạo ra từ trái tim"}
Mục đích gây quỹ: ${cause || "Hỗ trợ mổ tim cho trẻ em nghèo hoặc xây trường học vùng cao"}
Người quyên góp: ${donorName || "Một nhà thiện nguyện ẩn danh"}

Yêu cầu:
- Dùng ngôn ngữ tiếng Việt ấm áp, giàu cảm xúc.
- Kết thúc bằng lời kêu gọi đấu giá để cùng nhau tạo ra thay đổi.
- Độ dài khoảng 200-300 từ.
- Thêm emoji phù hợp 💙❤️
`;

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: prompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.8,
            max_tokens: 800,
        });

        res.json({ description: completion.choices[0].message.content });

    } catch (error) {
        console.error("Lỗi generate description:", error.message);
        res.status(500).json({ error: "Không thể tạo mô tả lúc này." });
    }
});
// === 3. [THÊM MỚI] ENDPOINT XÁC THỰC HỒ SƠ ĐĂNG KÝ ===
app.post('/api/verify-charity', async (req, res) => { // Đã xóa chữ 'a' dư
    try {
        const { ipfsHash, charityName } = req.body;
        if (!ipfsHash) return res.status(400).json({ error: "Thiếu IPFS Hash" });

        const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
        console.log(`📡 Đang kết nối IPFS: ${ipfsUrl}`);

        let documentText = "";
        try {
            // 1. Tải file PDF từ IPFS
            const ipfsRes = await axios.get(ipfsUrl, {
                responseType: 'arraybuffer', // Giữ nguyên để lấy dữ liệu thô
                timeout: 20000
            });

            // 2. Trích xuất text từ Buffer
            // Dùng trực tiếp hàm pdf() - thư viện này trả về Promise
            const data = await pdf(Buffer.from(ipfsRes.data));
            documentText = data.text;

            console.log("📄 Đã trích xuất văn bản từ PDF thành công.");
        } catch (e) {
            console.error("❌ Lỗi xử lý file PDF:", e.message);
            // Fallback: Nếu không đọc được PDF, gửi thông báo lỗi chi tiết
            return res.status(500).json({
                error: "Lỗi trích xuất PDF",
                score: 0,
                summary: "Hệ thống không thể đọc nội dung file PDF. Vui lòng kiểm tra định dạng file trên IPFS."
            });
        }

        // 3. Gửi cho Groq AI để đối soát
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "Bạn là chuyên gia thẩm định hồ sơ pháp lý. Chỉ trả về kết quả định dạng JSON: { \"is_valid\": boolean, \"score\": number, \"summary\": \"string\", \"reason\": \"string\" }"
                },
                {
                    role: "user",
                    content: `Đối soát tên Quỹ: "${charityName}" với nội dung hồ sơ PDF này: ${documentText.substring(0, 4000)}`
                }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(completion.choices[0].message.content);
        console.log(`✅ AI Audit thành công: ${charityName} - Score: ${result.score}`);
        res.json(result);

    } catch (error) {
        console.error("❌ Lỗi tổng thể:", error.message);
        res.status(500).json({
            error: "AI Audit thất bại",
            score: 0,
            summary: "Lỗi kết nối AI hoặc xử lý dữ liệu."
        });
    }
});
// --- KHỞI ĐỘNG SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n💙 ============================================`);
    console.log(`🚀 SUI CHARITY AUCTION AI SERVER ĐÃ KHỞI ĐỘNG`);
    console.log(`✅ Tính năng: Chatbot, Viết mô tả, Xác thực hồ sơ`);
    console.log(`✅ Đang lắng nghe tại: http://localhost:${PORT}`);
    console.log(`💙 ============================================\n`);
});