import React from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { metricRegistry } from '@/lib/metrics/metricRegistry';
import { MetricGroup } from '@/lib/metrics/metricRegistry.zod';

interface MetricKeySelectProps {
    value: string;
    onValueChange: (value: string) => void;
    filterGroup?: MetricGroup;
    placeholder?: string;
    className?: string;
}

const MetricKeySelect: React.FC<MetricKeySelectProps> = ({
    value,
    onValueChange,
    filterGroup,
    placeholder = "Selecione uma métrica",
    className
}) => {

    // Group metrics by group
    const groups: Record<string, typeof metricRegistry[string][]> = {};

    Object.values(metricRegistry).forEach(metric => {
        if (filterGroup && metric.group !== filterGroup) return;

        if (!groups[metric.group]) groups[metric.group] = [];
        groups[metric.group].push(metric);
    });

    return (
        <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger className={className}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {Object.entries(groups).map(([groupName, metrics]) => (
                    <SelectGroup key={groupName}>
                        <SelectLabel>{groupName}</SelectLabel>
                        {metrics.map(m => (
                            <SelectItem key={m.key} value={m.key}>
                                {m.label} ({m.unit})
                            </SelectItem>
                        ))}
                    </SelectGroup>
                ))}
            </SelectContent>
        </Select>
    );
};

export default MetricKeySelect;
