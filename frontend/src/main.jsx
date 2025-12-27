import React from 'react';
import ReactDOM from 'react-dom/client';
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import './index.css';
import '@mysten/dapp-kit/dist/index.css';
import { BrowserRouter } from 'react-router-dom';
const { networkConfig } = createNetworkConfig({
	testnet: { url: getFullnodeUrl('testnet') },
});
const queryClient = new QueryClient();
ReactDOM.createRoot(document.getElementById('root')).render(

	<QueryClientProvider client={queryClient}>
		<SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
			<WalletProvider autoConnect>
				<BrowserRouter>
					<App />
				</BrowserRouter>
			</WalletProvider>
		</SuiClientProvider>
	</QueryClientProvider>

);