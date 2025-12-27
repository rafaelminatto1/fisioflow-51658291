-- Migration: Push Notifications Seed Data
-- Description: Insert default notification templates and triggers

-- Insert default notification templates (sem icon_url se não existir)
INSERT INTO notification_templates (type, title_template, body_template, actions) 
SELECT * FROM (VALUES
('appointment_reminder', 'Lembrete de Consulta', 'Você tem uma consulta agendada para {{date}} às {{time}} com {{therapist}}.', '[
    {"action": "confirm", "title": "Confirmar", "icon": "/icons/check.png"},
    {"action": "reschedule", "title": "Reagendar", "icon": "/icons/calendar.png"}
]'::JSONB),

('appointment_change', 'Consulta Reagendada', 'Sua consulta foi reagendada para {{date}} às {{time}}.', '[
    {"action": "view", "title": "Ver Detalhes", "icon": "/icons/eye.png"}
]'::JSONB),

('exercise_reminder', 'Hora dos Exercícios! 💪', 'Não esqueça de fazer seus exercícios de {{exercise_type}}. Mantenha sua sequência!', '[
    {"action": "start", "title": "Iniciar Agora", "icon": "/icons/play.png"},
    {"action": "later", "title": "Mais Tarde", "icon": "/icons/clock.png"}
]'::JSONB),

('exercise_milestone', 'Parabéns! 🎉', 'Você completou {{milestone}} exercícios! Continue assim!', '[
    {"action": "share", "title": "Compartilhar", "icon": "/icons/share.png"},
    {"action": "continue", "title": "Continuar", "icon": "/icons/arrow-right.png"}
]'::JSONB),

('progress_update', 'Progresso Atualizado', 'Seu fisioterapeuta atualizou seu plano de tratamento. Confira as novidades!', '[
    {"action": "view", "title": "Ver Progresso", "icon": "/icons/chart.png"}
]'::JSONB),

('system_alert', 'Alerta do Sistema', '{{message}}', '[
    {"action": "dismiss", "title": "Dispensar", "icon": "/icons/x.png"}
]'::JSONB),

('therapist_message', 'Mensagem do Fisioterapeuta', '{{therapist}} enviou uma mensagem: {{message}}', '[
    {"action": "reply", "title": "Responder", "icon": "/icons/reply.png"},
    {"action": "view", "title": "Ver Conversa", "icon": "/icons/chat.png"}
]'::JSONB),

('payment_reminder', 'Lembrete de Pagamento', 'Você tem um pagamento pendente de R$ {{amount}} com vencimento em {{due_date}}.', '[
    {"action": "pay", "title": "Pagar Agora", "icon": "/icons/credit-card.png"},
    {"action": "view", "title": "Ver Detalhes", "icon": "/icons/eye.png"}
]'::JSONB)
) AS v(type, title_template, body_template, actions)
ON CONFLICT (type) DO NOTHING;

-- Insert default notification triggers
INSERT INTO notification_triggers (name, event_type, template_type, schedule_delay_minutes, conditions) VALUES
('Appointment Reminder 24h', 'appointment_created', 'appointment_reminder', 1440, '{"advance_hours": 24}'),
('Appointment Reminder 2h', 'appointment_created', 'appointment_reminder', 120, '{"advance_hours": 2}'),
('Appointment Change Alert', 'appointment_updated', 'appointment_change', 0, '{}'),
('Daily Exercise Reminder', 'exercise_prescribed', 'exercise_reminder', 0, '{"recurring": true, "time": "09:00"}'),
('Exercise Milestone Alert', 'exercise_completed', 'exercise_milestone', 0, '{"milestone_check": true}'),
('Progress Update Alert', 'treatment_plan_updated', 'progress_update', 0, '{}'),
('Therapist Message Alert', 'message_received', 'therapist_message', 0, '{}'),
('Payment Due Reminder', 'payment_due', 'payment_reminder', 0, '{"days_before": 3}');

-- Create function to handle appointment notifications
CREATE OR REPLACE FUNCTION handle_appointment_notification()
RETURNS TRIGGER AS $$
DECLARE
    trigger_rec notification_triggers%ROWTYPE;
    template_rec notification_templates%ROWTYPE;
BEGIN
    -- Handle appointment creation/update notifications
    FOR trigger_rec IN 
        SELECT * FROM notification_triggers 
        WHERE event_type = TG_ARGV[0] 
        AND (active = true OR active IS NULL)
    LOOP
        -- Get template
        SELECT * INTO template_rec 
        FROM notification_templates 
        WHERE type = trigger_rec.template_type 
        AND (active = true OR active IS NULL);
        
        IF FOUND THEN
            -- Schedule notification (this would be handled by Edge Functions in practice)
            INSERT INTO notification_history (user_id, type, title, body, data, status)
            VALUES (
                NEW.patient_id,
                template_rec.type,
                template_rec.title_template,
                template_rec.body_template,
                jsonb_build_object(
                    'appointment_id', NEW.id,
                    'date', NEW.appointment_date,
                    'time', NEW.appointment_time,
                    'therapist', 'Dr. Exemplo'
                ),
                'pending'
            );
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;