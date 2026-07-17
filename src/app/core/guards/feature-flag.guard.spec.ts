import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { chatbotFeatureGuard } from './feature-flag.guard';
import { environment } from '../../../environments/environment';

describe('chatbotFeatureGuard', () => {
  let routerMock: { createUrlTree: jest.Mock };
  const originalChatbotFlag = environment.features.chatbot;

  beforeEach(() => {
    routerMock = { createUrlTree: jest.fn() };

    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: routerMock }],
    });
  });

  afterEach(() => {
    environment.features.chatbot = originalChatbotFlag;
  });

  function runGuard(): boolean | UrlTree {
    return TestBed.runInInjectionContext(() => chatbotFeatureGuard({} as never, {} as never)) as
      | boolean
      | UrlTree;
  }

  it('permite el acceso cuando el feature flag está activo', () => {
    environment.features.chatbot = true;

    expect(runGuard()).toBe(true);
  });

  it('redirige a dashboard cuando el feature flag está desactivado', () => {
    environment.features.chatbot = false;
    const urlTree = {} as UrlTree;
    routerMock.createUrlTree.mockReturnValue(urlTree);

    const result = runGuard();

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
    expect(result).toBe(urlTree);
  });
});
