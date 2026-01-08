
-- Medical Requests Table
create table if not exists public.medical_requests (
    id uuid not null default gen_random_uuid(),
    patient_id uuid not null references public.patients(id) on delete cascade,
    organization_id uuid references public.organizations(id),
    doctor_name text,
    request_date date default current_date,
    notes text,
    created_at timestamptz default now(),
    primary key (id)
);

-- Medical Request Files Table
create table if not exists public.medical_request_files (
    id uuid not null default gen_random_uuid(),
    medical_request_id uuid not null references public.medical_requests(id) on delete cascade,
    organization_id uuid references public.organizations(id),
    file_path text not null,
    file_name text not null,
    file_type text,
    file_size integer,
    created_at timestamptz default now(),
    primary key (id)
);

-- Patient Exams Table
create table if not exists public.patient_exams (
    id uuid not null default gen_random_uuid(),
    patient_id uuid not null references public.patients(id) on delete cascade,
    organization_id uuid references public.organizations(id),
    title text not null,
    exam_date date default current_date,
    exam_type text, -- 'image', 'laboratory', 'report', 'other'
    description text,
    created_at timestamptz default now(),
    primary key (id)
);

-- Patient Exam Files Table
create table if not exists public.patient_exam_files (
    id uuid not null default gen_random_uuid(),
    exam_id uuid not null references public.patient_exams(id) on delete cascade,
    organization_id uuid references public.organizations(id),
    file_path text not null,
    file_name text not null,
    file_type text,
    file_size integer,
    created_at timestamptz default now(),
    primary key (id)
);

-- RLS
alter table public.medical_requests enable row level security;
alter table public.medical_request_files enable row level security;
alter table public.patient_exams enable row level security;
alter table public.patient_exam_files enable row level security;

-- Policies for medical_requests
create policy "Users can view medical requests for their organization"
    on public.medical_requests for select
    using (
        organization_id in (
            select organization_id from profiles
            where profiles.user_id = auth.uid()
        )
    );

create policy "Users can insert medical requests for their organization"
    on public.medical_requests for insert
    with check (
        organization_id in (
            select organization_id from profiles
            where profiles.user_id = auth.uid()
        )
    );

create policy "Users can update medical requests for their organization"
    on public.medical_requests for update
    using (
        organization_id in (
            select organization_id from profiles
            where profiles.user_id = auth.uid()
        )
    );

create policy "Users can delete medical requests for their organization"
    on public.medical_requests for delete
    using (
        organization_id in (
            select organization_id from profiles
            where profiles.user_id = auth.uid()
        )
    );

-- Policies for medical_request_files
create policy "Users can view request files for their organization"
    on public.medical_request_files for select
    using (
        organization_id in (
            select organization_id from profiles
            where profiles.user_id = auth.uid()
        )
    );

create policy "Users can insert request files for their organization"
    on public.medical_request_files for insert
    with check (
        organization_id in (
            select organization_id from profiles
            where profiles.user_id = auth.uid()
        )
    );
    
create policy "Users can delete request files for their organization"
    on public.medical_request_files for delete
    using (
        organization_id in (
            select organization_id from profiles
            where profiles.user_id = auth.uid()
        )
    );

-- Policies for patient_exams
create policy "Users can view exams for their organization"
    on public.patient_exams for select
    using (
        organization_id in (
            select organization_id from profiles
            where profiles.user_id = auth.uid()
        )
    );

create policy "Users can insert exams for their organization"
    on public.patient_exams for insert
    with check (
        organization_id in (
            select organization_id from profiles
            where profiles.user_id = auth.uid()
        )
    );

create policy "Users can update exams for their organization"
    on public.patient_exams for update
    using (
        organization_id in (
            select organization_id from profiles
            where profiles.user_id = auth.uid()
        )
    );

create policy "Users can delete exams for their organization"
    on public.patient_exams for delete
    using (
        organization_id in (
            select organization_id from profiles
            where profiles.user_id = auth.uid()
        )
    );

-- Policies for patient_exam_files
create policy "Users can view exam files for their organization"
    on public.patient_exam_files for select
    using (
        organization_id in (
            select organization_id from profiles
            where profiles.user_id = auth.uid()
        )
    );

create policy "Users can insert exam files for their organization"
    on public.patient_exam_files for insert
    with check (
        organization_id in (
            select organization_id from profiles
            where profiles.user_id = auth.uid()
        )
    );
    
create policy "Users can delete exam files for their organization"
    on public.patient_exam_files for delete
    using (
        organization_id in (
            select organization_id from profiles
            where profiles.user_id = auth.uid()
        )
    );

-- Storage buckets setup (idempotent)
insert into storage.buckets (id, name, public) values ('medical-requests', 'medical-requests', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values ('patient-exams', 'patient-exams', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload medical request files"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'medical-requests' );

create policy "Authenticated users can view medical request files"
on storage.objects for select
to authenticated
using ( bucket_id = 'medical-requests' );

create policy "Authenticated users can upload exam files"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'patient-exams' );

create policy "Authenticated users can view exam files"
on storage.objects for select
to authenticated
using ( bucket_id = 'patient-exams' );
