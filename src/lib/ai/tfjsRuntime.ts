type TfjsCore = typeof import("@tensorflow/tfjs");

let tfReadyPromise: Promise<TfjsCore> | null = null;

export async function loadTfjsPoseRuntime(): Promise<TfjsCore> {
	if (!tfReadyPromise) {
		tfReadyPromise = (async () => {
			const tf = await import("@tensorflow/tfjs");

			const currentBackend = tf.getBackend();
			if (!currentBackend) {
				try {
					await tf.setBackend("webgl");
				} catch {
					await tf.setBackend("cpu");
				}
			}

			await tf.ready();

			return tf;
		})().catch((error) => {
			tfReadyPromise = null;
			throw error;
		});
	}

	return tfReadyPromise;
}
