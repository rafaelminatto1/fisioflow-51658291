import {
    Card
} from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/shared/ui/dropdown-menu';
import {
    Clock, AlertTriangle, CheckCircle2,
    ArrowRight, Eye, Star, StarOff,
    Copy, Trash2, MoreVertical
} from 'lucide-react';
import { ExerciseProtocol } from '@/hooks/useExerciseProtocols';
import { cn } from '@/lib/utils';
import { getProtocolCategory, PROTOCOL_CATEGORIES } from '@/data/protocols';
import { Edit } from 'lucide-react';

interface ProtocolCardEnhancedProps {
    protocol: ExerciseProtocol;
    onClick: () => void;
    onEdit: (protocol: ExerciseProtocol) => void;
    onDelete: (id: string) => void;
    onDuplicate: (protocol: ExerciseProtocol) => void;
    onFavorite: (id: string) => void;
    isFavorite: boolean;
    viewMode: 'grid' | 'list';
}

export function ProtocolCardEnhanced({ protocol, onClick, onEdit, onDelete, onDuplicate, onFavorite, isFavorite, viewMode }: ProtocolCardEnhancedProps) {
    const getMilestones = () => {
        if (!protocol.milestones) return [];
        if (Array.isArray(protocol.milestones)) return protocol.milestones;
        return [];
    };

    const getRestrictions = () => {
        if (!protocol.restrictions) return [];
        if (Array.isArray(protocol.restrictions)) return protocol.restrictions;
        return [];
    };

    const milestones = getMilestones();
    const restrictions = getRestrictions();
    const category = getProtocolCategory(protocol.condition_name);
    const categoryInfo = PROTOCOL_CATEGORIES.find(c => c.id === category) || PROTOCOL_CATEGORIES[0];

    if (viewMode === 'list') {
        return (
            <Card
                className="p-4 hover:shadow-lg transition-all cursor-pointer group border hover:border-primary/30 flex items-center gap-4"
                onClick={onClick}
            >
                <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0', categoryInfo.color + '/10')}>
                    <categoryInfo.icon className={cn('h-6 w-6', categoryInfo.color.replace('bg-', 'text-'))} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                            {protocol.name}
                        </h3>
                        {isFavorite && <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{protocol.condition_name}</p>
                </div>

                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>{protocol.weeks_total || '-'} sem</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>{milestones.length}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span>{restrictions.length}</span>
                    </div>
                </div>

                <Badge variant={protocol.protocol_type === 'pos_operatorio' ? 'default' : 'secondary'}>
                    {protocol.protocol_type === 'pos_operatorio' ? 'Pós-Op' : 'Patologia'}
                </Badge>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick(); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(protocol); }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(protocol); }}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onFavorite(protocol.id); }}>
                            {isFavorite ? <StarOff className="h-4 w-4 mr-2" /> : <Star className="h-4 w-4 mr-2" />}
                            {isFavorite ? 'Remover Favorito' : 'Favoritar'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); onDelete(protocol.id); }}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Card>
        );
    }

    return (
        <Card
            className="overflow-hidden hover:shadow-xl transition-all cursor-pointer group border-2 hover:border-primary/30 relative"
            onClick={onClick}
        >
            {/* Category ribbon */}
            <div className={cn('h-1.5 w-full', categoryInfo.color)} />

            {/* Favorite badge */}
            {isFavorite && (
                <div className="absolute top-4 right-4 z-10">
                    <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                </div>
            )}

            <div className="p-5">
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                    <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center', categoryInfo.color + '/10')}>
                        <categoryInfo.icon className={cn('h-5 w-5', categoryInfo.color.replace('bg-', 'text-'))} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base group-hover:text-primary transition-colors line-clamp-1">
                            {protocol.name}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">{protocol.condition_name}</p>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick(); }}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(protocol); }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(protocol); }}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onFavorite(protocol.id); }}>
                                {isFavorite ? <StarOff className="h-4 w-4 mr-2" /> : <Star className="h-4 w-4 mr-2" />}
                                {isFavorite ? 'Remover Favorito' : 'Favoritar'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); onDelete(protocol.id); }}
                                className="text-destructive focus:text-destructive"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Duration bar */}
                {protocol.weeks_total && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground">Duração</span>
                            <span className="font-medium">{protocol.weeks_total} semanas</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className={cn('h-full rounded-full', `bg-gradient-to-r ${categoryInfo.color.replace('bg-', 'from-')} to-green-500`)}
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <p className="text-lg font-bold text-green-600">{milestones.length}</p>
                        <p className="text-xs text-muted-foreground">Marcos</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <p className="text-lg font-bold text-amber-600">{restrictions.length}</p>
                        <p className="text-xs text-muted-foreground">Restrições</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <p className="text-lg font-bold text-blue-600">{Math.ceil((protocol.weeks_total || 12) / 4)}</p>
                        <p className="text-xs text-muted-foreground">Fases</p>
                    </div>
                </div>

                {/* Type badge */}
                <div className="flex items-center justify-between">
                    <Badge variant={protocol.protocol_type === 'pos_operatorio' ? 'default' : 'secondary'} className="text-xs">
                        {protocol.protocol_type === 'pos_operatorio' ? 'Pós-Operatório' : 'Patologia'}
                    </Badge>
                </div>
            </div>

            {/* View button */}
            <div className="px-5 pb-5">
                <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    Ver Protocolo
                    <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
            </div>
        </Card>
    );
}
