import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

function snakeCase(str: string): string {
  return str.replace(/([A-Z])/g, (char) => `_${char.toLowerCase()}`);
}

export class SnakeCaseNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  override columnName(
    propertyName: string,
    customName: string,
    embeddedPrefixes: string[],
  ): string {
    const name = customName ?? snakeCase(propertyName);
    if (embeddedPrefixes.length) {
      return snakeCase(embeddedPrefixes.join('_')) + '_' + name;
    }
    return name;
  }
}
