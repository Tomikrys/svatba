# Loading UX Improvement

## Changes Made

### Problem
The entire page was blocked by a full-screen loading indicator while 3D models loaded, preventing users from seeing any content.

### Solution
The loading indicator now only covers the 3D canvas area on the left side, allowing the content on the right to display immediately.

## Files Modified

### 1. presentation.html
- Moved `#loading` div inside `.scene-container`
- Updated loading text to "Načítám 3D model..." (Loading 3D model...)

### 2. css/presentation.css
- Changed `#loading` from `position: fixed` to `position: absolute`
- Changed dimensions from `100vw/100vh` to `100%` (relative to parent)
- Reduced z-index from 1000 to 10 (local to scene container)
- Added fade-in animation to `.content-container` for smooth appearance

## Behavior

### Desktop (50/50 split layout)
- **Left side (3D):** Shows loading indicator until models load
- **Right side (Content):** Displays immediately with fade-in animation
- Users can read info while 3D loads

### Mobile (Overlay layout)
- **Background:** 3D scene with loading indicator
- **Foreground:** Content scrolls over 3D with semi-transparent background
- Content is immediately accessible

## User Experience Flow

1. **Page loads** (instant)
   - Content appears on right with fade-in animation
   - Loading indicator shows on left over 3D canvas area
   - Users can start reading wedding info immediately

2. **3D models load** (1-3 seconds)
   - Loading indicator fades out
   - 3D scene becomes visible and interactive
   - Content remains visible throughout

3. **User scrolls**
   - Camera transitions to different angles
   - Content and 3D stay in sync
   - Smooth experience with no interruption

## Benefits

✅ **Faster perceived load time** - Content visible immediately
✅ **Better UX** - Users aren't blocked by loading screen
✅ **Information accessible** - Can find date/location while 3D loads
✅ **Professional** - Progressive loading like modern web apps
✅ **Mobile-friendly** - Works on all screen sizes

## Technical Details

### HTML Structure
```html
<div class="scene-container">
    <!-- Loading only covers this area -->
    <div id="loading">
        <div class="loader"></div>
        <p>Načítám 3D model...</p>
    </div>
    <div id="canvas-container"></div>
</div>

<div class="content-container">
    <!-- Visible immediately -->
    <section>...</section>
</div>
```

### CSS Key Changes
```css
/* Was: Fixed, full screen */
#loading {
    position: fixed;
    width: 100vw;
    height: 100vh;
    z-index: 1000;
}

/* Now: Absolute, local to scene */
#loading {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 10;
}

/* Content fades in smoothly */
.content-container {
    animation: fadeIn 0.5s ease-in;
}
```

## Testing

To test:
```bash
npm run serve
# Visit http://localhost:8080/presentation.html
# Open with throttled network (Chrome DevTools > Network > Slow 3G)
# Observe content appears immediately while 3D loads
```

## Future Enhancements

Consider adding:
- Skeleton loader for 3D area showing outline of cathedral
- Progress percentage for model loading
- Preload first scene's model for even faster initial display
- Lazy load other scenes' models as user scrolls
