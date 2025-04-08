/**
 * Unit tests for the ButtonFinder class
 * Tests the ability to find various types of buttons in a dialog
 */
import { ButtonFinder } from '../../../src/utils/finders/buttonFinder.js';

// Mock selectors for testing
const mockSelectors = {
  buttonTypes: {
    accept: {
      selectors: [
        { query: '#acceptBtn', priority: 10 },
        { query: 'button[id*="accept"]', priority: 8 },
        { query: '.accept-button', priority: 9 }
      ],
      textPatterns: [
        { pattern: 'accept all cookies', priority: 10 },
        { pattern: 'accept all', priority: 9 },
        { pattern: 'accept', priority: 5 }
      ],
      excludePatterns: [
        'settings',
        'preferences'
      ]
    },
    reject: {
      selectors: [
        { query: '#rejectBtn', priority: 10 },
        { query: 'button[id*="reject"]', priority: 8 },
        { query: '[id*="necessary"]', priority: 8 }
      ],
      textPatterns: [
        { pattern: 'reject all', priority: 10 },
        { pattern: 'necessary only', priority: 9 },
        { pattern: 'reject', priority: 6 }
      ]
    },
    customize: {
      selectors: [
        { query: '#settingsBtn', priority: 10 },
        { query: 'button[id*="settings"]', priority: 8 }
      ],
      textPatterns: [
        { pattern: 'cookie settings', priority: 10 },
        { pattern: 'settings', priority: 8 }
      ]
    }
  }
};

describe('ButtonFinder', () => {
  let buttonFinder;
  let container;
  
  beforeEach(() => {
    buttonFinder = new ButtonFinder(mockSelectors);
    container = document.createElement('div');
    document.body.appendChild(container);
  });
  
  afterEach(() => {
    document.body.removeChild(container);
  });
  
  test('findAcceptButton should find button by ID', () => {
    container.innerHTML = '<button id="acceptBtn">Accept</button>';
    const button = buttonFinder.findAcceptButton(container);
    expect(button).not.toBeNull();
    expect(button.id).toBe('acceptBtn');
  });
  
  test('findAcceptButton should find button by ID pattern', () => {
    container.innerHTML = '<button id="accept-all-cookies">Accept All</button>';
    const button = buttonFinder.findAcceptButton(container);
    expect(button).not.toBeNull();
    expect(button.id).toBe('accept-all-cookies');
  });
  
  test('findAcceptButton should find button by class', () => {
    container.innerHTML = '<button class="accept-button">Accept</button>';
    const button = buttonFinder.findAcceptButton(container);
    expect(button).not.toBeNull();
    expect(button.className).toBe('accept-button');
  });
  
  test('findAcceptButton should find button by text content', () => {
    container.innerHTML = `
      <button>Cancel</button>
      <button>Accept All Cookies</button>
      <button>Settings</button>
    `;
    const button = buttonFinder.findAcceptButton(container);
    expect(button).not.toBeNull();
    expect(button.textContent.trim()).toBe('Accept All Cookies');
  });
  
  test('findAcceptButton should respect exclude patterns', () => {
    container.innerHTML = `
      <button>Accept Cookie Settings</button>
      <button>Accept All</button>
    `;
    const button = buttonFinder.findAcceptButton(container);
    expect(button).not.toBeNull();
    expect(button.textContent.trim()).toBe('Accept All');
  });
  
  test('findRejectButton should find button by ID', () => {
    container.innerHTML = '<button id="rejectBtn">Reject</button>';
    const button = buttonFinder.findRejectButton(container);
    expect(button).not.toBeNull();
    expect(button.id).toBe('rejectBtn');
  });
  
  test('findRejectButton should find necessary-only button by text', () => {
    container.innerHTML = `
      <button>Accept All</button>
      <button>Necessary Cookies Only</button>
    `;
    const button = buttonFinder.findRejectButton(container);
    expect(button).not.toBeNull();
    expect(button.textContent.trim()).toBe('Necessary Cookies Only');
  });
  
  test('findCustomizeButton should find settings button', () => {
    container.innerHTML = `
      <button id="settingsBtn">Cookie Settings</button>
      <button>Accept All</button>
    `;
    const button = buttonFinder.findCustomizeButton(container);
    expect(button).not.toBeNull();
    expect(button.id).toBe('settingsBtn');
  });
  
  test('findAllButtons should find all buttons in container', () => {
    container.innerHTML = `
      <div>
        <button id="btn1">Button 1</button>
        <a role="button" id="btn2">Button 2</a>
        <input type="button" id="btn3" value="Button 3">
      </div>
    `;
    const buttons = buttonFinder.findAllButtons(container);
    expect(buttons.length).toBe(3);
    expect(buttons[0].id).toBe('btn1');
    expect(buttons[1].id).toBe('btn2');
    expect(buttons[2].id).toBe('btn3');
  });
  
  test('determineButtonType should identify accept button', () => {
    const button = document.createElement('button');
    button.textContent = 'Accept All Cookies';
    const type = buttonFinder.determineButtonType(button);
    expect(type).toBe('accept');
  });
  
  test('determineButtonType should identify reject button', () => {
    const button = document.createElement('button');
    button.textContent = 'Reject All';
    const type = buttonFinder.determineButtonType(button);
    expect(type).toBe('reject');
  });
  
  test('determineButtonType should identify customize button', () => {
    const button = document.createElement('button');
    button.textContent = 'Cookie Settings';
    const type = buttonFinder.determineButtonType(button);
    expect(type).toBe('customize');
  });
  
  test('determineButtonType should return null for unknown button', () => {
    const button = document.createElement('button');
    button.textContent = 'Some Random Text';
    const type = buttonFinder.determineButtonType(button);
    expect(type).toBeNull();
  });
}); 