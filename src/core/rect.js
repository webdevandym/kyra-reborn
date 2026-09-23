export function bodyRect(body) {
  return {
    left: body.x - body.w / 2,
    right: body.x + body.w / 2,
    top: body.y - body.h,
    bottom: body.y,
  };
}

export function centeredRect(x, y, w, h) {
  return { left: x - w / 2, right: x + w / 2, top: y - h / 2, bottom: y + h / 2 };
}

export function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
