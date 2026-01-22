import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/web/ui/table';
import { FolderOpen, Image as ImageIcon, ArrowLeft, RefreshCw } from 'lucide-react';
import { dicomWebClient, DicomStudy } from '@/services/dicom/dicomWebClient';
import DicomViewer from './DicomViewer';

interface DicomBrowserProps {
    onSelectSeries?: (studyInstanceUid: string, seriesInstanceUid: string) => void;
}

// Helper to safely extract DICOM tag values
const getTagValue = (obj: any, tag: string): string => {
    const val = obj?.[tag]?.Value?.[0];
    if (typeof val === 'object' && val !== null) {
        return val.Alphabetic || '';
    }
    return String(val || '');
};

const DicomBrowser: React.FC<DicomBrowserProps> = (_props) => {
    const [view, setView] = useState<'studies' | 'series' | 'viewer'>('studies');
    const [studies, setStudies] = useState<DicomStudy[]>([]);
    const [selectedStudy, setSelectedStudy] = useState<DicomStudy | null>(null);
    const [series, setSeries] = useState<Record<string, unknown>[]>([]);
    const [selectedSeriesUid, setSelectedSeriesUid] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // load studies
    const loadStudies = async () => {
        setLoading(true);
        try {
            const data = await dicomWebClient.searchStudies();
            setStudies(data);
        } catch (e) {
            console.error("Failed to load studies", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStudies();
    }, []);

    const handleSelectStudy = async (study: DicomStudy) => {
        setSelectedStudy(study);
        setLoading(true);
        try {
            // Find series for this study
            // QIDO-RS: /studies/{studyUID}/series
            const studyUid = getTagValue(study, '0020000D');
            // We use the client to search series. 
            // We need to extend the client or just use invoke manually here for MVP if method missing?
            // Let's implement series search inline or assume client has it? 
            // The client artifact I wrote had `searchStudies`. It didn't have `searchSeries` explicitly implemented yet.
            // I will implement it here using the generic proxy access logic or quick fetch.
            // Actually, I should update the client. But for speed now, I'll invoke directly.

            // Re-use `dicomWebClient` logic but for series path
            // path: studies/{uid}/series

            // We need to access the proxy function. 
            // Let's just assume I added searchSeries to client or add it now.
            // Wait, I can't edit the client file in this step without a tool call.
            // I'll add a helper here.

            const { supabase } = await import('@/integrations/supabase/client');

            const path = `studies/${studyUid}/series`;
            const { data, error } = await supabase.functions.invoke('dicom-proxy', {
                method: 'GET',
                headers: {
                    'Accept': 'application/dicom+json',
                    'x-dicom-path': path
                }
            });

            if (error) throw error;
            setSeries(data);
            setView('series');

        } catch (e) {
            console.error("Failed to load series", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectSeries = (seriesUid: string) => {
        setSelectedSeriesUid(seriesUid);
        setView('viewer');
    };

    if (view === 'viewer' && selectedStudy && selectedSeriesUid) {
        return (
            <div className="flex flex-col h-full">
                <div className="p-2 border-b flex items-center gap-2 bg-slate-100">
                    <Button variant="ghost" size="sm" onClick={() => setView('series')}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                    </Button>
                    <span className="font-semibold">{getTagValue(selectedStudy, '00100010')}</span>
                    <span className="text-muted-foreground text-sm">{getTagValue(selectedStudy, '00081030')}</span>
                </div>
                <div className="flex-1 overflow-hidden relative">
                    <DicomViewer
                        studyInstanceUid={getTagValue(selectedStudy, '0020000D')}
                        seriesInstanceUid={selectedSeriesUid}
                        wadoUrl={dicomWebClient.getProxyUrl()} // We pass the proxy base URL
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4 h-full overflow-y-auto">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    {view === 'studies' ? 'Pacientes / Estudos' : 'Séries do Estudo'}
                </h2>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={view === 'series' ? () => loadStudies() : loadStudies} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    {view === 'series' && (
                        <Button variant="outline" onClick={() => setView('studies')}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                        </Button>
                    )}
                </div>
            </div>

            {view === 'studies' && (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Paciente</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Mod.</TableHead>
                                <TableHead className="text-right">Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {studies.length === 0 && !loading && (
                                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum estudo encontrado.</TableCell></TableRow>
                            )}
                            {studies.map((study, i) => (
                                <TableRow key={i} className="cursor-pointer hover:bg-slate-50" onClick={() => handleSelectStudy(study)}>
                                    <TableCell className="font-medium">{getTagValue(study, '00100010')}</TableCell>
                                    <TableCell>{getTagValue(study, '00080020')}</TableCell>
                                    <TableCell>{getTagValue(study, '00081030')}</TableCell>
                                    <TableCell>{getTagValue(study, '00080061')}</TableCell>
                                    <TableCell className="text-right"><FolderOpen className="w-4 h-4 ml-auto text-blue-500" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}

            {view === 'series' && selectedStudy && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {series.map((s, i) => {
                        const modality = getTagValue(s, '00080060');
                        const desc = getTagValue(s, '0008103E');
                        const instances = getTagValue(s, '00200011') || '?';
                        const uid = getTagValue(s, '0020000E');

                        return (
                            <Card key={i} className="cursor-pointer hover:border-blue-500 transition-colors" onClick={() => handleSelectSeries(uid)}>
                                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                                    <div className="w-16 h-16 bg-slate-200 rounded flex items-center justify-center">
                                        <ImageIcon className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg">{modality}</p>
                                        <p className="text-xs text-muted-foreground line-clamp-2">{desc}</p>
                                        <p className="text-xs mt-1 bg-slate-100 px-2 py-0.5 rounded-full inline-block">{instances} imgs</p>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DicomBrowser;
