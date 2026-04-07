type TfjsCore = typeof import("@tensorflow/tfjs-core");

let tfReadyPromise: Promise<TfjsCore> | null = null;

export async function loadTfjsPoseRuntime(): Promise<TfjsCore> {
	if (!tfReadyPromise) {
		tfReadyPromise = (async () => {
			const [tf] = await Promise.all([
				import("@tensorflow/tfjs-core"),
				import("@tensorflow/tfjs-converter"),
				import("@tensorflow/tfjs-backend-webgl"),
			]);

			const currentBackend = tf.getBackend();
			if (!currentBackend) {
				try {
					await tf.setBackend("webgl");
				} catch {
					await import("@tensorflow/tfjs-backend-cpu");
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
