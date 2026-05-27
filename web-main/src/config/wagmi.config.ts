import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { env } from '@/env';
import {
    mantleSepoliaTestnet,
} from 'wagmi/chains';
import { defineChain } from 'viem';

const mantleSepoliaCustom = defineChain({
    ...mantleSepoliaTestnet,
    rpcUrls: {
        default: {
            http: ['https://mantle-sepolia.g.alchemy.com/v2/jsv8qLwrBKaShfeL_NJzfHbWoj5h-hnM'],
        },
        public: {
            http: ['https://mantle-sepolia.g.alchemy.com/v2/jsv8qLwrBKaShfeL_NJzfHbWoj5h-hnM'],
        },
    },
});

export const wagmiConfig = getDefaultConfig({
    appName: 'iNMerg',
    appDescription: "Starting your zk journey with proof generation for GitHub Pull Requests.",
    projectId: env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    chains: [
        mantleSepoliaCustom,
    ],
    ssr: true,
});