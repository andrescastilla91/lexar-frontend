import { FormControl } from '@angular/forms';
import { optionalEmailValidator } from './email.validator';

describe('optionalEmailValidator', () => {
  const run = (value: unknown) => optionalEmailValidator(new FormControl(value));

  it.each(['', null, undefined])('acepta el campo vacío (%p)', (value) => {
    expect(run(value)).toBeNull();
  });

  it.each(['facturas@bufete.com', 'ana.perez+lex@mail.co', 'a@sub.dominio.com.co'])('acepta %s', (value) => {
    expect(run(value)).toBeNull();
  });

  it.each(['sin-arroba', 'a@b', 'a@b.c', '@bufete.com', 'ana@', 'ana @bufete.com', 'ana@bufete..com', ' ana@bufete.com'])(
    'rechaza %p',
    (value) => {
      expect(run(value)).toEqual({ email: true });
    },
  );
});
