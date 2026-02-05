import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, ChevronDown, ChevronUp, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, collection, query, where, limit, onSnapshot } from '@/integrations/firebase/app';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { PatientHelpers } from '@/types';

interface Patient {
  id: string;
  name: string;
}

export const IncompleteRegistrationAlert: React.FC = () => {
  const [incompletePatients, setIncompletePatients] = React.useState<Patient[]>([]);
  const [dismissedIds, setDismissedIds] = React.useState<string[]>([]);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {

    const q = query(
      collection(db, 'patients'),
      where('incomplete_registration', '==', true),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const patients: Patient[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        patients.push({
          id: doc.id,
          name: data.full_name || data.name || 'Paciente',
        });
      });
      setIncompletePatients(patients);
    }, (error) => {
      logger.error('Error fetching incomplete patients', error, 'IncompleteRegistrationAlert');
    });

    return () => unsubscribe();
  }, []);

  const visiblePatients = incompletePatients.filter(
    (p) => !dismissedIds.includes(p.id)
  );

  if (visiblePatients.length === 0) return null;

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds((prev) => [...prev, id]);
  };

  const handleComplete = (patientId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigate(`/patients/${patientId}`);
  };

  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card
        className={cn(
          "border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "shadow-md ring-1 ring-amber-200 dark:ring-amber-800" : "shadow-sm hover:shadow-md cursor-pointer hover:bg-amber-100/40 dark:hover:bg-amber-900/10"
        )}
        onClick={!isExpanded ? toggleExpand : undefined}
      >
        <CardContent className="p-0">
          {/* Header Section - Always Visible */}
          <div
            className={cn(
              "flex items-center justify-between p-3 sm:p-4 gap-3",
              isExpanded ? "border-b border-amber-100 dark:border-amber-800/30 bg-amber-50/80 dark:bg-amber-950/30" : ""
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative">
                <div className={cn(
                  "relative z-10 p-2 rounded-full shrink-0 transition-colors duration-300",
                  isExpanded ? "bg-amber-100 dark:bg-amber-900/60" : "bg-amber-100/50 dark:bg-amber-900/20"
                )}>
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                </div>
                {!isExpanded && (
                  <span className="absolute inset-0 rounded-full bg-amber-400/20 dark:bg-amber-500/20 animate-ping" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-amber-900 dark:text-amber-100 text-sm sm:text-base truncate flex items-center gap-2">
                  Cadastros Pendentes
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                    {visiblePatients.length}
                  </span>
                </h3>
                <p className="text-xs sm:text-sm text-amber-700/80 dark:text-amber-300/80 mt-0.5 font-medium">
                  Resolva pendências para liberar o acesso total
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand();
              }}
              className="shrink-0 h-8 w-8 p-0 text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 rounded-full"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <div className="p-3 sm:p-4 bg-white/40 dark:bg-black/10 backdrop-blur-sm">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {visiblePatients.map((patient) => (
                      <div
                        key={patient.id}
                        className="group flex flex-col gap-2 p-3 bg-white dark:bg-card border border-amber-100 dark:border-amber-900/30 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-amber-200 dark:hover:border-amber-700"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-500 text-xs font-bold border border-amber-100 dark:border-amber-800/30">
                              {PatientHelpers.getInitials(patient)}
                            </div>
                            <span className="text-sm font-medium truncate text-foreground/90" title={PatientHelpers.getName(patient)}>
                              {PatientHelpers.getName(patient)}
                            </span>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => handleDismiss(patient.id, e)}
                            className="h-6 w-6 -mr-1 -mt-1 text-muted-foreground/40 hover:text-muted-foreground hover:bg-transparent"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span className="sr-only">Dispensar</span>
                          </Button>
                        </div>

                        <div className="flex gap-2 mt-1">
                          <Button
                            size="sm"
                            onClick={(e) => handleComplete(patient.id, e)}
                            className="w-full h-8 text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-200 border border-amber-200 dark:border-amber-800/50 shadow-none hover:shadow-sm"
                          >
                            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                            Completar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-3 border-t border-amber-100 dark:border-amber-900/30 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleExpand}
                      className="text-xs text-muted-foreground hover:text-foreground h-7"
                    >
                      Fechar lista
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};
