import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSuiClient, useSignAndExecuteTransaction, useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { Loader2, DollarSign, ShieldCheck, User, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { PACKAGE_ID, MODULE_NAME, GLOBAL_CONFIG_ID } from '../constants';

export default function DisbursementRequest() {
    const { id } = useParams(); // Charity ID
    const account = useCurrentAccount();
    const client = useSuiClient();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();

    const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [beneficiaryAddress, setBeneficiaryAddress] = useState('');

    // 1. Lấy dữ liệu dự án để kiểm tra Admin & Số dư
    const { data: charity, refetch } = useSuiClientQuery(
        'getObject',
        { id: id, options: { showContent: true } }
    );

    const fields = charity?.data?.content?.fields;
    const vaultBalance = fields?.vault ? Number(fields.vault) / 1e9 : 0;
    const charityCreator = fields?.creator || fields?.admin;

    useEffect(() => {
        if (account && charityCreator) {
            // Kiểm tra xem ví hiện tại có phải là người tạo dự án (Admin) không
            setIsAdmin(account.address === charityCreator);
            setIsCheckingAdmin(false);
        }
    }, [account, charityCreator]);

    // 2. Hàm Giải Ngân (Dành cho Admin)
    const handleDisburse = async () => {
        if (!isAdmin) return toast.error("Chỉ Admin dự án mới có quyền giải ngân!");
        if (!beneficiaryAddress) return toast.error("Vui lòng nhập địa chỉ người nhận!");

        const txb = new Transaction();
        try {
            // Gọi hàm trong Move: public entry fun disburse(config, charity, amount, recipient, ctx)
            // Ở đây ví dụ giải ngân toàn bộ vault
            txb.moveCall({
                target: `${PACKAGE_ID}::${MODULE_NAME}::disburse_funds`,
                arguments: [
                    txb.object(GLOBAL_CONFIG_ID),
                    txb.object(id),
                    txb.pure.u64(fields.vault), // Giải ngân toàn bộ số tiền trong Vault
                    txb.pure.address(beneficiaryAddress),
                ],
            });

            signAndExecute({ transaction: txb }, {
                onSuccess: () => {
                    toast.success("Giải ngân thành công!");
                    refetch();
                },
                onError: (err) => toast.error("Lỗi: " + err.message)
            });
        } catch (e) {
            console.error(e);
        }
    };

    if (isCheckingAdmin) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-cyan-500" /></div>;

    return (
        <div className="min-h-screen bg-[#020406] pt-32 pb-20 px-6 text-white">
            <div className="max-w-3xl mx-auto">

                {/* Header Card */}
                <div className="bg-gradient-to-br from-cyan-900/20 to-transparent p-8 rounded-[40px] border border-white/10 mb-8">
                    <div className="flex items-center gap-3 text-cyan-400 mb-4">
                        <ShieldCheck size={20} />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Hệ thống giải ngân On-chain</span>
                    </div>
                    <h1 className="text-4xl font-black uppercase italic mb-2">Quản lý quỹ dự án</h1>
                    <p className="text-slate-400 font-mono text-xs break-all">{id}</p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* Thông tin số dư */}
                    <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[35px] flex justify-between items-center">
                        <div>
                            <p className="text-slate-500 text-[10px] font-black uppercase mb-1">Số dư khả dụng</p>
                            <p className="text-5xl font-black text-white">{vaultBalance.toLocaleString()} <span className="text-xl text-cyan-500">SUI</span></p>
                        </div>
                        <div className="p-4 bg-cyan-500/10 rounded-2xl">
                            <DollarSign size={32} className="text-cyan-500" />
                        </div>
                    </div>

                    {/* Giao diện dành cho Admin */}
                    {isAdmin ? (
                        <div className="bg-cyan-600/5 border border-cyan-500/20 p-8 rounded-[40px] space-y-6">
                            <div className="flex items-center gap-2 text-yellow-500 font-bold uppercase text-xs">
                                <AlertCircle size={16} /> Quyền Admin: Xác nhận giải ngân
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 ml-2">Địa chỉ ví người thụ hưởng</label>
                                <input
                                    type="text"
                                    value={beneficiaryAddress}
                                    onChange={(e) => setBeneficiaryAddress(e.target.value)}
                                    placeholder="Nhập địa chỉ 0x..."
                                    className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl outline-none focus:border-cyan-500 font-mono text-sm transition-all"
                                />
                            </div>

                            <button
                                onClick={handleDisburse}
                                className="w-full py-5 bg-cyan-500 text-black rounded-2xl font-black uppercase italic hover:bg-white transition-all flex items-center justify-center gap-3 shadow-lg shadow-cyan-500/20"
                            >
                                <CheckCircle size={20} /> Phê duyệt & Chuyển tiền
                            </button>

                            <p className="text-[9px] text-center text-slate-500 italic">
                                * Lưu ý: Hành động này không thể hoàn tác. Tiền sẽ được gửi trực tiếp từ Smart Contract.
                            </p>
                        </div>
                    ) : (
                        // Giao diện dành cho Người nhận (Chỉ xem hoặc gửi yêu cầu)
                        <div className="bg-white/[0.02] border border-dashed border-white/10 p-12 rounded-[40px] text-center">
                            <User size={48} className="mx-auto text-slate-700 mb-4" />
                            <h3 className="text-xl font-bold mb-2">Bạn đang đăng nhập với tư cách Người thụ hưởng</h3>
                            <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
                                Vui lòng cung cấp địa chỉ ví của bạn cho Admin dự án để được kiểm tra và nhận giải ngân.
                            </p>
                            <div className="p-4 bg-white/5 rounded-2xl font-mono text-xs text-cyan-400">
                                {account?.address}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}