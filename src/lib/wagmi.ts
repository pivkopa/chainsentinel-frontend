import { http, createConfig } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

export const config = getDefaultConfig({
  appName: "ChainSentinel",
  projectId: "YOUR_PROJECT_ID", // MVP: replace with actual or dummy for now
  chains: [mainnet, sepolia],
  ssr: true,
});
