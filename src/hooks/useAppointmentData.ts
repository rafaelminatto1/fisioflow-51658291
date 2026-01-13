import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useAppointmentData = (appointmentId: string | undefined) => {
    // Buscar dados do agendamento do Supabase com retry e timeout
    const { data: appointment, isLoading: appointmentLoading, error: appointmentError } = useQuery({
        queryKey: ['appointment', appointmentId],
        queryFn: async () => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/ae75a3a7-6143-4496-8bed-b84b16af833f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/hooks/useAppointmentData.ts:9',message:'Fetching appointment',data:{appointmentId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
            // #endregion

            if (!appointmentId) throw new Error('ID do agendamento não fornecido');

            // Verificar sessão antes de fazer a query
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            // Verificar se usuário é admin
            let isAdmin = false;
            if (session?.user) {
              const { data: userRoles } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id)
                .eq('role', 'admin')
                .limit(1);
              isAdmin = (userRoles?.length || 0) > 0;
            }
            
            // #region agent log
            (()=>{
              const logData={location:'src/hooks/useAppointmentData.ts:16',message:'Session check before query',data:{appointmentId,hasSession:!!session,userId:session?.user?.id,userEmail:session?.user?.email,isAdmin,sessionError:sessionError?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'};
              console.log('[DEBUG]',logData);
              fetch('http://127.0.0.1:7242/ingest/ae75a3a7-6143-4496-8bed-b84b16af833f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(e=>console.error('[DEBUG] Log send failed:',e));
            })();
            // #endregion

            // Tentar buscar usando query direta (mesma estrutura que useAppointments que funciona)
            // Primeiro sem relacionamento para evitar problemas de RLS
            const result = await supabase
                .from('appointments')
                .select('*')
                .eq('id', appointmentId)
                .maybeSingle();

            // #region agent log
            (()=>{
              // Capturar informações completas da resposta - incluindo o objeto completo
              const responseInfo = {
                appointmentId,
                appointmentFound: !!result.data,
                hasError: !!result.error,
                errorMessage: result.error?.message,
                errorCode: result.error?.code,
                errorDetails: result.error?.details,
                errorHint: result.error?.hint,
                status: result.status,
                statusText: result.statusText,
                dataType: typeof result.data,
                dataIsNull: result.data === null,
                dataIsUndefined: result.data === undefined,
                dataKeys: result.data ? Object.keys(result.data) : [],
                resultKeys: result ? Object.keys(result) : [],
                resultStringified: JSON.stringify(result).substring(0, 200), // Primeiros 200 chars
                // Verificar se é um problema de RLS (status 200 mas sem dados)
                isRLSBlocked: result.status === 200 && !result.data && !result.error,
                // Verificar se maybeSingle está retornando null corretamente
                maybeSingleReturnsNull: result.data === null && result.status === 200 && !result.error
              };
              const logData={location:'src/hooks/useAppointmentData.ts:18',message:'Appointment fetch without relationship result',data:responseInfo,timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'};
              console.log('[DEBUG]',logData);
              fetch('http://127.0.0.1:7242/ingest/ae75a3a7-6143-4496-8bed-b84b16af833f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(e=>console.error('[DEBUG] Log send failed:',e));
            })();
            // #endregion

            // Se encontrou o agendamento, buscar o paciente separadamente
            if (result.data && !result.error) {
                const patientId = result.data.patient_id;
                if (patientId) {
                    const patientResult = await supabase
                        .from('patients')
                        .select('*')
                        .eq('id', patientId)
                        .maybeSingle();
                    
                    // Adicionar dados do paciente ao agendamento
                    if (patientResult.data) {
                        result.data.patients = patientResult.data;
                    }
                }
            }

            // Retornar null em vez de undefined para evitar erro do React Query
            const data = result.data ?? null;
            // #region agent log
            (()=>{const logData={location:'src/hooks/useAppointmentData.ts:31',message:'Appointment fetch result',data:{appointmentId,appointmentFound:!!data,hasError:!!result.error,errorMessage:result.error?.message,errorCode:result.error?.code,errorDetails:result.error?.details,errorHint:result.error?.hint,status:result.status,statusText:result.statusText,dataType:typeof data,hasData:!!result.data},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'};console.log('[DEBUG]',logData);fetch('http://127.0.0.1:7242/ingest/ae75a3a7-6143-4496-8bed-b84b16af833f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(e=>console.error('[DEBUG] Log send failed:',e));})();
            // #endregion
            return data;
        },
        enabled: !!appointmentId,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        staleTime: 0, // Sempre buscar dados frescos
        cacheTime: 0, // Não fazer cache
    });

    const patientId = appointment?.patient_id;

    // Buscar informações do paciente do Supabase com retry e timeout
    const { data: patient, isLoading: patientLoading, error: patientError } = useQuery({
        queryKey: ['patient', patientId],
        queryFn: async () => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/ae75a3a7-6143-4496-8bed-b84b16af833f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/hooks/useAppointmentData.ts:44',message:'Fetching patient',data:{patientId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
            // #endregion

            if (!patientId) throw new Error('ID do paciente não fornecido');

            const result = await supabase
                .from('patients')
                .select('*')
                .eq('id', patientId)
                .maybeSingle();
            // Retornar null em vez de undefined para evitar erro do React Query
            const data = result.data ?? null;
            // #region agent log
            (()=>{const logData={location:'src/hooks/useAppointmentData.ts:59',message:'Patient fetch result',data:{patientId,patientFound:!!data,hasError:!!result.error,errorMessage:result.error?.message,errorCode:result.error?.code,errorDetails:result.error?.details,errorHint:result.error?.hint,status:result.status,statusText:result.statusText,dataType:typeof data,hasData:!!result.data},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'};console.log('[DEBUG]',logData);fetch('http://127.0.0.1:7242/ingest/ae75a3a7-6143-4496-8bed-b84b16af833f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(e=>console.error('[DEBUG] Log send failed:',e));})();
            // #endregion
            return data;
        },
        enabled: !!patientId,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        staleTime: 1000 * 60 * 5, // 5 minutos
    });

    return {
        appointment,
        patient,
        patientId,
        isLoading: appointmentLoading || patientLoading,
        error: appointmentError || patientError,
        appointmentLoading,
        patientLoading,
        appointmentError,
        patientError
    };
};
