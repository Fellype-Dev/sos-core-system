-- Turmas por unidade (slug = valor em students.class_group e attendance_sessions.class_group).
create table if not exists class_groups (
    id uuid primary key default gen_random_uuid(),
    program_id uuid not null references programs (id) on delete cascade,
    slug text not null,
    name text not null,
    sort_order int not null default 0,
    created_at timestamptz not null default now(),
    unique (program_id, slug)
);

create index if not exists idx_class_groups_program on class_groups (program_id);

-- Turmas padrão A e B por programa (idempotente).
insert into class_groups (program_id, slug, name, sort_order)
select p.id, v.slug, v.name, v.sort_order
from programs p
cross join (
    values ('A', 'Turma A', 0),
           ('B', 'Turma B', 1)
) as v (slug, name, sort_order)
where not exists (
    select 1
    from class_groups cg
    where cg.program_id = p.id
      and cg.slug = v.slug
);
