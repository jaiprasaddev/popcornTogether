/**
 * Custom Cursor Effect
 * Simply link this file to add a custom cursor with blur effect
 */

(function() {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCustomCursor);
  } else {
    initCustomCursor();
  }

  function initCustomCursor() {
    // Create cursor elements
    const cursor = document.createElement('div');
    cursor.id = 'custom-cursor';
    
    const cursorBlur = document.createElement('div');
    cursorBlur.id = 'custom-cursor-blur';
    
    // Append to body
    document.body.appendChild(cursor);
    document.body.appendChild(cursorBlur);
    
    // Add custom cursor class to body
    document.body.classList.add('custom-cursor-active');
    
    // Track mouse movement
    document.addEventListener('mousemove', function(e) {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
      cursorBlur.style.left = e.clientX + 'px';
      cursorBlur.style.top = e.clientY + 'px';
    });
    
    // Add hover effects on interactive elements
    const interactiveElements = 'a, button, [role="button"], input[type="submit"], input[type="button"], .clickable';
    
    document.addEventListener('mouseover', function(e) {
      if (e.target.matches(interactiveElements)) {
        cursor.classList.add('hover');
      }
    });
    
    document.addEventListener('mouseout', function(e) {
      if (e.target.matches(interactiveElements)) {
        cursor.classList.remove('hover');
      }
    });
    
    // Optional: Add custom class to specific elements for custom hover effects
    // You can add 'data-cursor-hover' attribute to any element
    document.addEventListener('mouseover', function(e) {
      if (e.target.hasAttribute('data-cursor-hover')) {
        cursor.classList.add('hover');
      }
    });
    
    document.addEventListener('mouseout', function(e) {
      if (e.target.hasAttribute('data-cursor-hover')) {
        cursor.classList.remove('hover');
      }
    });
  }
})();
