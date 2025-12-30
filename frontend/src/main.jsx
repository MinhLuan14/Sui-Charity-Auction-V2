
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import './index.css';

// Đừng quên import CSS của bộ thư viện để giao diện chọn ví hiển thị đẹp
import '@mysten/dapp-kit/dist/index.css';

import { BrowserRouter } from 'react-router-dom';

// 1. Cấu hình Network
const { networkConfig } = createNetworkConfig({
	testnet: { url: getFullnodeUrl('testnet') },
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
				{/* WalletProvider sẽ tự động quét mọi ví có trên trình duyệt:
                    - Sui Wallet
                    - Slush Wallet
                    - Surf Wallet
                    - OKX Wallet (Sui)
                */}
				<WalletProvider
					autoConnect={true}
					stashedWallet={{ name: 'ThreeHub Cloud Wallet' }} // Tùy chọn: Hỗ trợ ZkLogin
				>
					<BrowserRouter>
						<App />
					</BrowserRouter>
				</WalletProvider>
			</SuiClientProvider>
		</QueryClientProvider>
	</React.StrictMode>
);