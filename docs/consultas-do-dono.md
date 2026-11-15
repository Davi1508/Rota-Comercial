# Consultas do dono (SQL Editor do Supabase)

Cole no **SQL Editor → New query** e toque em **Run**. As de leitura (`select`) não mudam nada.

## Ativar quem pagou
Troque o e-mail. Ativa a conta, que deixa de vencer.
```sql
update public.profiles set plano = 'ativo'
where id = (select id from auth.users where email = 'email@do-cliente.com');
```

## Pausar quem parou de pagar
A conta volta para o modo leitura (vê tudo, não lança nada). Nada é apagado.
```sql
update public.profiles set plano = 'trial', trial_ate = now()
where id = (select id from auth.users where email = 'email@do-cliente.com');
```

## Dar mais dias de teste
```sql
update public.profiles set trial_ate = now() + interval '7 days'
where id = (select id from auth.users where email = 'email@do-cliente.com');
```

## Ver todos os usuários e a situação de cada um
```sql
select u.email, p.nome, p.plano, p.trial_ate::date as teste_ate,
       u.created_at::date as criou_em, u.last_sign_in_at::date as ultimo_acesso,
       (select count(*) from public.pedidos x where x.user_id = u.id) as pedidos
from auth.users u join public.profiles p on p.id = u.id
order by u.created_at desc;
```

## Quantos estão em cada situação
```sql
select case when plano = 'ativo' then 'pagante'
            when trial_ate > now() then 'em teste'
            else 'teste vencido' end as situacao,
       count(*)
from public.profiles group by 1;
```

## Últimos erros do app
```sql
select criado_em, mensagem, onde, tela, versao, left(navegador, 60) as navegador
from public.erros order by criado_em desc limit 30;
```

## Limpar erros antigos (mais de 60 dias)
```sql
delete from public.erros where criado_em < now() - interval '60 days';
```
