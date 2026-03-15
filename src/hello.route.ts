import { Controller, Get, Route, Path } from 'tsoa';
// import { type ParameterizedContext, type DefaultContext } from 'koa';

@Route('hello')
export class HelloController extends Controller {
  /**
   * Get a personalized greeting
   * @param name The name to greet
   * @returns A greeting message
   */
  @Get('{name}')
  public async getGreeting(@Path() name: string): Promise<{ message: string }> {
    return { message: `Hello ${name}!` };
  }
}
