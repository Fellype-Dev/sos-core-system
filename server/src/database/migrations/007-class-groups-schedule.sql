-- Turmas com dias da semana e faixa etária (cronograma SCFV 2026).
-- weekdays usa a mesma convenção de students.scfv_frequency_days: seg, ter, qua, qui, sex, sab, dom.

alter table class_groups add column if not exists weekdays text[] not null default '{}';
alter table class_groups add column if not exists age_range text;

-- Remove as turmas padrão A/B criadas pelo seed antigo, se ninguém as utiliza.
delete from class_groups cg
where cg.slug in ('A', 'B')
  and cg.name in ('Turma A', 'Turma B')
  and not exists (
    select 1 from students s
    where s.program_id = cg.program_id and s.class_group = cg.slug
  )
  and not exists (
    select 1 from attendance_sessions a
    where a.program_id = cg.program_id and a.class_group = cg.slug
  );

-- Seed das turmas reais por unidade (idempotente: só insere se o slug ainda não existe).
insert into class_groups (program_id, slug, name, sort_order, period, weekdays, age_range)
select p.id, v.slug, v.name, v.sort_order, v.period, v.weekdays::text[], v.age_range
from programs p
join (
    values
        -- VIVER — manhã (08h às 10h30)
        ('VIVER',  'vencedores',             'Vencedores',            0,  'manha', '{seg}',             '60+'),
        ('VIVER',  'amizade',                'Amizade',               1,  'manha', '{ter}',             '60+'),
        ('VIVER',  'luz-do-sol',             'Luz do Sol',            2,  'manha', '{qua}',             '30 a 59'),
        ('VIVER',  'amigos-para-sempre',     'Amigos para Sempre',    3,  'manha', '{qua}',             '60+'),
        ('VIVER',  'felicidade',             'Felicidade',            4,  'manha', '{sex}',             '60+'),
        -- VIVER — tarde (13h às 15h30)
        ('VIVER',  'esperanca',              'Esperança',             5,  'tarde', '{seg}',             '60+'),
        ('VIVER',  'alegria-de-viver',       'Alegria de Viver',      6,  'tarde', '{ter}',             '30 a 59'),
        ('VIVER',  'do-amor',                'Do Amor',               7,  'tarde', '{qua}',             '60+'),
        ('VIVER',  'sonhadores',             'Sonhadores',            8,  'tarde', '{qui}',             '30 a 59'),
        ('VIVER',  'alegria',                'Alegria',               9,  'tarde', '{qui}',             '60+'),
        ('VIVER',  'por-do-sol',             'Por do Sol',            10, 'tarde', '{sex}',             '60+'),
        -- SONHAR — manhã (08h às 12h)
        ('SONHAR', 'estrela-da-manha-i',     'Estrela da Manhã I',    0,  'manha', '{seg,qua}',         '6 a 8 anos'),
        ('SONHAR', 'boa-nova-i',             'Boa Nova I',            1,  'manha', '{seg,qua}',         '8 a 10 anos'),
        ('SONHAR', 'caminhada-i',            'Caminhada I',           2,  'manha', '{seg,qua}',         '11 a 13 anos'),
        ('SONHAR', 'unidos-pelo-futuro-i',   'Unidos pelo Futuro I',  3,  'manha', '{seg,qua}',         '13 a 15 anos'),
        ('SONHAR', 'esperanca-i',            'Esperança I',           4,  'manha', '{ter,qui}',         '6 a 8 anos'),
        ('SONHAR', 'alegria-i',              'Alegria I',             5,  'manha', '{ter,qui}',         '8 a 10 anos'),
        ('SONHAR', 'novo-horizonte-i',       'Novo Horizonte I',      6,  'manha', '{ter,qui}',         '11 a 14 anos'),
        ('SONHAR', 'futuro-brilhante-manha', 'Futuro Brilhante',      7,  'manha', '{ter,qui}',         '15 a 17 anos'),
        -- SONHAR — tarde (12h às 17h)
        ('SONHAR', 'estrela-da-manha-ii',    'Estrela da Manhã II',   8,  'tarde', '{seg,qua}',         '6 a 8 anos'),
        ('SONHAR', 'boa-nova-ii',            'Boa Nova II',           9,  'tarde', '{seg,qua}',         '8 a 10 anos'),
        ('SONHAR', 'caminhada-ii',           'Caminhada II',          10, 'tarde', '{seg,qua}',         '11 a 13 anos'),
        ('SONHAR', 'unidos-pelo-futuro-ii',  'Unidos pelo Futuro II', 11, 'tarde', '{seg,qua}',         '13 a 15 anos'),
        ('SONHAR', 'esperanca-ii',           'Esperança II',          12, 'tarde', '{ter,qui}',         '6 a 8 anos'),
        ('SONHAR', 'alegria-ii',             'Alegria II',            13, 'tarde', '{ter,qui}',         '8 a 10 anos'),
        ('SONHAR', 'novo-horizonte-ii',      'Novo Horizonte II',     14, 'tarde', '{ter,qui}',         '11 a 14 anos'),
        ('SONHAR', 'futuro-brilhante-tarde', 'Futuro Brilhante',      15, 'tarde', '{ter,qui}',         '15 a 17 anos'),
        ('SONHAR', 'fortaleza',              'Fortaleza',             16, 'tarde', '{sex}',             '0 a 6 anos'),
        -- SEMEAR — manhã (08h às 12h)
        ('SEMEAR', 'pingo-de-gente',         'Pingo de Gente',        0,  'manha', '{seg,ter,qua,qui}', '6 a 8 anos'),
        ('SEMEAR', 'raio-de-sol',            'Raio de Sol',           1,  'manha', '{seg,ter,qua,qui}', '9 a 10 anos'),
        ('SEMEAR', 'luz-da-manha',           'Luz da Manhã',          2,  'manha', '{seg,ter,qua,qui}', '11 a 14 anos'),
        ('SEMEAR', 'caminho-jovem-manha',    'Caminho Jovem',         3,  'manha', '{seg,qua}',         '13 a 15 anos'),
        ('SEMEAR', 'jovens-do-futuro-manha', 'Jovens do Futuro',      4,  'manha', '{ter,qui}',         '15 a 17 anos'),
        ('SEMEAR', 'passos-de-anjo',         'Passos de Anjo',        5,  'manha', '{sex}',             '0 a 6 anos'),
        -- SEMEAR — tarde (12h às 17h)
        ('SEMEAR', 'esperanca',              'Esperança',             6,  'tarde', '{seg,ter,qua,qui}', '6 a 8 anos'),
        ('SEMEAR', 'luz-do-futuro',          'Luz do Futuro',         7,  'tarde', '{seg,ter,qua,qui}', '9 a 10 anos'),
        ('SEMEAR', 'crianca-feliz',          'Criança Feliz',         8,  'tarde', '{seg,ter,qua,qui}', '11 a 14 anos'),
        ('SEMEAR', 'caminho-jovem-tarde',    'Caminho Jovem',         9,  'tarde', '{seg,qua}',         '13 a 15 anos'),
        ('SEMEAR', 'jovens-do-futuro-tarde', 'Jovens do Futuro',      10, 'tarde', '{ter,qui}',         '15 a 17 anos')
) as v (program_code, slug, name, sort_order, period, weekdays, age_range)
  on v.program_code = p.code
where not exists (
    select 1 from class_groups cg
    where cg.program_id = p.id and cg.slug = v.slug
);
