create table if not exists referrals (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null references students(id) on delete cascade,
    program_id uuid references programs(id),
    created_by uuid references users(id),
    referral_age_range text,
    referral_scfv_programs text[],
    referral_spontaneous_demand boolean not null default false,
    referral_family_member_in_scfv boolean not null default false,
    referral_family_followup boolean not null default false,
    referral_pcd_responsible_name text,
    referral_pcd_responsible_phone text,
    referral_priority_conditions text[],
    referral_priority_axes text[],
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_referrals_student on referrals(student_id);
create index if not exists idx_referrals_program on referrals(program_id);

create trigger if not exists trg_referrals_updated_at
before update on referrals
for each row execute function set_updated_at();
