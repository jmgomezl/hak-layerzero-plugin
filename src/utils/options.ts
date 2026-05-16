import { Options } from "@layerzerolabs/lz-v2-utilities";

export interface LzOptions {
  /** Gas limit to pass to the executor on the destination chain */
  gasLimit: bigint;
  /** Native token value (in wei) to deliver alongside the message — usually 0 */
  value?: bigint;
}

/**
 * Encodes LayerZero executor options into the bytes format expected by
 * EndpointV2.quote() and OApp.send(). Uses lzReceive option type 1.
 */
export function buildOptions(opts: LzOptions): string {
  let builder = Options.newOptions().addExecutorLzReceiveOption(
    Number(opts.gasLimit),
    Number(opts.value ?? 0n)
  );
  return builder.toHex();
}
