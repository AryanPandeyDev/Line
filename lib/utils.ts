import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================================
// LINE Token Constants & Helpers
// ============================================================================

const LINE_TOKEN_DECIMALS = 9;

/**
 * Format LINE token balance from raw BigInt to human-readable
 */
export function formatLine(raw: bigint): { raw: string; human: number } {
  return {
    raw: raw.toString(),
    human: Number(raw) / (10 ** LINE_TOKEN_DECIMALS),
  };
}

/**
 * Legacy alias for formatLine
 */
export function formatLineBalance(raw: bigint): { raw: string; human: number } {
  return formatLine(raw);
}

/**
 * Convert SS58 address to raw hex ActorId
 * Note: Full implementation requires @polkadot/util-crypto
 */
export function ss58ToRaw(address: string): string {
  // If already raw hex format
  if (/^0x[a-fA-F0-9]{64}$/.test(address)) {
    return address.toLowerCase();
  }

  // For SS58 addresses, we need @polkadot/util-crypto
  // This is a placeholder - real conversion happens in SubWallet integration
  // The actual raw address comes from the wallet extension
  throw new Error("SS58 decoding requires wallet extension. Use raw address from wallet.");
}

/**
 * Format short address for display
 */
export function formatShortAddress(address: string): string {
  if (!address) return "";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get VARA balance for an ActorId - call from server-side only
 */
export async function getVaraBalance(actorIdRaw: string): Promise<number> {
  try {
    const { GearApi } = await import("@gear-js/api");
    const api = await GearApi.create({ providerAddress: "wss://testnet.vara.network" });

    try {
      const accountInfo = await api.query.system.account(actorIdRaw);
      const balancePlanck = accountInfo.data.free.toBigInt();
      return Number(balancePlanck) / 1e12; // VARA has 12 decimals
    } finally {
      await api.disconnect();
    }
  } catch (error) {
    console.error("Error fetching VARA balance:", error);
    return 0;
  }
}

/**
 * Get LINE token balance for an ActorId - call from server-side only
 */
export async function getLineBalance(actorIdRaw: string): Promise<{ raw: string; human: number }> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/wallet/state?addressRaw=${encodeURIComponent(actorIdRaw)}`
    );
    if (!response.ok) {
      return { raw: "0", human: 0 };
    }
    const data = await response.json();
    return { raw: data.lineRaw || "0", human: data.lineBalance || 0 };
  } catch (error) {
    console.error("Error fetching LINE balance:", error);
    return { raw: "0", human: 0 };
  }
}
