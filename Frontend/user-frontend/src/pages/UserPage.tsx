import { useEffect, useState } from "react";
import type { User } from "../models/user.model";

const UserPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  useEffect(() => {
    fetch("http://localhost:8000/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(data));
  }, []);
  return (
    <div>
      <table border={1}>
        <tr>
          <th>ID</th>
          <th>Họ tên</th>
          <th>Mã số sinh viên</th>
          <th>Email</th>
        </tr>
        {users.map((user) => (
          <tr key={user.id}>
            <td>{user.id}</td>
            <td>{user.fullName}</td>
            <td>{user.studentCode}</td>
            <td>{user.email}</td>
          </tr>
        ))}
      </table>
    </div>
  );
};
export default UserPage;
