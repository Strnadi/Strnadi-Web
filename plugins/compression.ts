export default function CompressionPlugin(): BunPlugin {
    return {
        name: 'compression-plugin',
        setup(build) {
            build.onEnd(() => {
            });
        },
    };
}
