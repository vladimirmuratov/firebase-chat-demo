import { useEffect, useRef } from "react";

export function useAutoScroll(ref, deps = [], threshold = 80) {
    const isUserNearBottomRef = useRef(true);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const onScroll = () => {
            const distanceFromBottom =
                el.scrollHeight - (el.scrollTop + el.clientHeight);
            isUserNearBottomRef.current = distanceFromBottom < threshold;
        };

        el.addEventListener("scroll", onScroll);
        return () => el.removeEventListener("scroll", onScroll);
    }, [ref, threshold]);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (isUserNearBottomRef.current) {
            el.lastElementChild?.scrollIntoView({ behavior: "smooth" });
        }
    }, deps); // будет срабатывать при изменении сообщений
}
