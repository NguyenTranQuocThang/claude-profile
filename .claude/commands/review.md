Review code hiện tại (git diff hoặc file được chỉ định) theo các tiêu chí:

1. **Correctness** — logic có đúng không, edge cases nào bị bỏ sót
2. **Security** — SQL injection, XSS, auth bypass, exposed secrets
3. **Performance** — N+1 queries, unnecessary re-renders, memory leaks
4. **Conventions** — có theo CLAUDE.md conventions không
5. **Simplicity** — có abstraction thừa không, có thể đơn giản hóa không

Với mỗi vấn đề tìm được: nêu file:line, giải thích tại sao là vấn đề, đề xuất fix cụ thể.

$ARGUMENTS
