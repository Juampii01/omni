-- La app anterior tenía un trigger de auto-signup en auth.users que insertaba
-- en el `profiles` viejo. Rompe la creación de cualquier usuario nuevo porque
-- apunta a un esquema que ya no existe (dropeado en el reset a cero).
-- El diseño nuevo NO usa auto-signup: los usuarios se crean vía API interna
-- (service_role) que arma explícitamente client_id + role.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
