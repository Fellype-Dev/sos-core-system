create extension if not exists pgcrypto;

create table if not exists programs (
    id uuid primary key default gen_random_uuid(),
    code text unique not null,
    name text not null,
    age_range text,
    location text,
    created_at timestamptz not null default now()
);

create table if not exists users (
    id uuid primary key default gen_random_uuid(),
    full_name text not null,
    email text unique not null,
    password_hash text not null,
    role text not null check (role in ('admin', 'sede', 'coordenador')),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists user_programs (
    user_id uuid not null references users(id) on delete cascade,
    program_id uuid not null references programs(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, program_id)
);

create table if not exists class_groups (
    id uuid primary key default gen_random_uuid(),
    program_id uuid not null references programs(id) on delete cascade,
    slug text not null,
    name text not null,
    sort_order int not null default 0,
    created_at timestamptz not null default now(),
    unique (program_id, slug)
);

create index if not exists idx_class_groups_program on class_groups(program_id);

create table if not exists students (
    id uuid primary key default gen_random_uuid(),
    full_name text not null,
    birth_date date,
    nis_user text,
    color text,
    cpf_cns text,
    is_allergic boolean not null default false,
    allergy_details text,
    shoe_size text,
    clothing_size text,
    has_health_issues boolean not null default false,
    health_issues_details text,
    has_disability boolean not null default false,
    disability_details text,
    school_name text,
    school_grade text,
    school_shift text,
    address_street text,
    address_neighborhood text,
    address_reference text,
    address_extra text,
    guardian_name text,
    guardian_cpf text,
    guardian_nis text,
    guardian_phone text,
    guardian_relationship text,
    guardian_workplace text,
    family_benefit boolean not null default false,
    family_benefit_details text,
    family_members jsonb,
    cras_status text,
    cras_link_reason text,
    cras_referral_agency text,
    cras_technician text,
    scfv_insertion_date date,
    scfv_update_date date,
    scfv_frequency_days text[],
    scfv_shift text[],
    scfv_group text,
    scfv_instructor text,
    scfv_boarding text,
    scfv_disembarkation text,
    advisor_notes text,
    enrollment_code text unique,
    contact_phone text,
    allergies text,
    medical_notes text,
    program_id uuid not null references programs(id),
    class_group text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists student_notes (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null references students(id) on delete cascade,
    author_user_id uuid not null references users(id),
    note_text text not null,
    created_at timestamptz not null default now()
);

create table if not exists attendance_sessions (
    id uuid primary key default gen_random_uuid(),
    program_id uuid not null references programs(id),
    attendance_date date not null,
    class_group text,
    period text,
    created_by uuid not null references users(id),
    created_at timestamptz not null default now(),
    unique(program_id, attendance_date, class_group, period)
);

create table if not exists attendance_records (
    session_id uuid not null references attendance_sessions(id) on delete cascade,
    student_id uuid not null references students(id) on delete cascade,
    status text not null check (status in ('present', 'absent')),
    note text,
    created_at timestamptz not null default now(),
    primary key (session_id, student_id)
);

create index if not exists idx_users_email on users(email);
create index if not exists idx_students_program on students(program_id);
create index if not exists idx_students_program_class on students(program_id, class_group);
create index if not exists idx_notes_student on student_notes(student_id);
create index if not exists idx_attendance_program_date on attendance_sessions(program_id, attendance_date);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
before update on users
for each row execute function set_updated_at();

drop trigger if exists trg_students_updated_at on students;
create trigger trg_students_updated_at
before update on students
for each row execute function set_updated_at();

insert into programs (code, name, age_range, location)
values
    ('SEMEAR', 'Programa Semear', 'Criancas', 'Unidade 1'),
    ('VIVER', 'Programa Viver', 'Adolescentes', 'Unidade 2'),
    ('SONHAR', 'Programa Sonhar', 'Idosos', 'Unidade 3')
on conflict (code) do nothing;

insert into class_groups (program_id, slug, name, sort_order)
select p.id, v.slug, v.name, v.sort_order
from programs p
cross join (
    values ('A', 'Turma A', 0),
           ('B', 'Turma B', 1)
) as v (slug, name, sort_order)
where not exists (
    select 1 from class_groups cg where cg.program_id = p.id and cg.slug = v.slug
);
