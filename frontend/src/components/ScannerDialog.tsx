import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { Camera, X, Loader2 } from 'lucide-react';

interface Props {
    onScan: (barcode: string) => void;
    onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string>('');
    const [initializing, setInitializing] = useState(true);

    useEffect(() => {
        let codeReader: BrowserMultiFormatReader | null = new BrowserMultiFormatReader();
        let isStreamActive = true;

        async function startScanning() {
            try {
                const videoInputDevices = await codeReader!.listVideoInputDevices();

                if (!videoInputDevices.length) {
                    setError('No cameras found.');
                    setInitializing(false);
                    return;
                }

                // Prefer environment-facing camera
                let selectedDeviceId = videoInputDevices[0].deviceId;
                for (const device of videoInputDevices) {
                    if (device.label.toLowerCase().includes('back') ||
                        device.label.toLowerCase().includes('environment') ||
                        device.label.toLowerCase().includes('rear')) {
                        selectedDeviceId = device.deviceId;
                        break;
                    }
                }

                if (!videoRef.current) return;

                codeReader!.decodeFromVideoDevice(
                    selectedDeviceId,
                    videoRef.current,
                    (result, err) => {
                        if (result && isStreamActive) {
                            // Successfully decoded
                            const text = result.getText();
                            // Prevent multiple scans of the same code rapidly
                            isStreamActive = false;
                            onScan(text);
                        }
                        if (err && !(err instanceof NotFoundException)) {
                            console.error(err);
                        }
                    }
                );
                setInitializing(false);
            } catch (err: any) {
                console.error('Camera initialization error:', err);
                setError('Could not access camera. Please allow permissions via HTTPS.');
                setInitializing(false);
            }
        }

        startScanning();

        return () => {
            isStreamActive = false;
            if (codeReader) {
                codeReader.reset();
                codeReader = null;
            }
        };
    }, [onScan]);

    return (
        <div className="fixed inset-0 bg-bark-900/90 z-[60] flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-black rounded-2xl overflow-hidden aspect-[4/3] shadow-2xl flex items-center justify-center">

                {initializing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-cream-50 z-10 bg-bark-900">
                        <Loader2 className="animate-spin mb-4" size={32} />
                        <p>Initializing Camera...</p>
                    </div>
                )}

                {error ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-rust-400 p-6 text-center bg-bark-900">
                        <Camera size={48} className="mb-4 opacity-50" />
                        <p className="font-medium">{error}</p>
                        <p className="text-xs mt-2 opacity-70">Requires secure context (HTTPS) or localhost.</p>
                    </div>
                ) : (
                    <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        autoPlay
                        playsInline
                        muted
                    />
                )}

                {/* Scanning Reticle overlay */}
                {!error && !initializing && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col">
                        <div className="flex-1 bg-black/40" />
                        <div className="flex h-48">
                            <div className="flex-1 bg-black/40" />
                            <div className="w-64 border-2 border-moss-500/50 relative">
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-moss-400" />
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-moss-400" />
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-moss-400" />
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-moss-400" />
                                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-rust-500/50 shadow-[0_0_8px_rgba(255,100,100,0.8)]" />
                            </div>
                            <div className="flex-1 bg-black/40" />
                        </div>
                        <div className="flex-1 bg-black/40 pb-10 flex items-end justify-center">
                            <p className="text-cream-50/80 font-medium text-sm">Align barcode within frame</p>
                        </div>
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 bg-bark-900/80 text-cream-50 p-2 rounded-full hover:bg-rust-500 transition-colors z-20"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
}
