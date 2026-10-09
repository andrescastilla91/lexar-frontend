import { HttpErrorResponse } from '@angular/common/http';
import { downloadBlob, readBlobErrorMessage, todayStamp } from './blob-download.util';

describe('blob-download.util', () => {
  describe('downloadBlob', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      URL.createObjectURL = jest.fn().mockReturnValue('blob:test');
      URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('dispara la descarga con el nombre dado y libera la URL después', () => {
      const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

      downloadBlob(new Blob(['a']), 'archivo.csv');

      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
      expect(document.querySelector('a[download="archivo.csv"]')).toBeNull();
      clickSpy.mockRestore();
    });
  });

  describe('todayStamp', () => {
    it('devuelve la fecha actual en formato YYYY-MM-DD', () => {
      expect(todayStamp()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('readBlobErrorMessage', () => {
    it('relee el message del cuerpo Blob del error', (done) => {
      const err = new HttpErrorResponse({
        status: 400,
        error: new Blob([JSON.stringify({ message: 'Mensaje real' })]),
      });

      readBlobErrorMessage(err, 'fallback').subscribe({
        error: (e: Error) => {
          expect(e.message).toBe('Mensaje real');
          done();
        },
      });
    });

    it('usa el fallback si el cuerpo no es JSON', (done) => {
      const err = new HttpErrorResponse({ status: 500, error: new Blob(['no json']) });

      readBlobErrorMessage(err, 'fallback').subscribe({
        error: (e: Error) => {
          expect(e.message).toBe('fallback');
          done();
        },
      });
    });

    it('usa el fallback si el JSON no trae message', (done) => {
      const err = new HttpErrorResponse({ status: 500, error: new Blob(['{}']) });

      readBlobErrorMessage(err, 'fallback').subscribe({
        error: (e: Error) => {
          expect(e.message).toBe('fallback');
          done();
        },
      });
    });

    it('re-emite el error original cuando el cuerpo no es un Blob', (done) => {
      const err = new HttpErrorResponse({ status: 0, error: 'network' });

      readBlobErrorMessage(err, 'fallback').subscribe({
        error: (e: unknown) => {
          expect(e).toBe(err);
          done();
        },
      });
    });
  });
});
